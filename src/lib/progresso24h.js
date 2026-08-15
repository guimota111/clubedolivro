// Progresso das últimas 24 h.
//
// Para saber quanto alguém leu "ontem para hoje" não basta a % atual: é
// preciso lembrar por onde ela andou. Cada documento de `progresso` guarda um
// campo `historico`: uma lista enxuta de marcações `{ pct, em }`, onde `em` é
// um instante em milissegundos (Date.now() do navegador — o Firestore não
// aceita serverTimestamp() dentro de arrays).
//
// A % "de 24 h atrás" é a da marcação mais recente anterior à janela. O que
// veio depois dela é o avanço recente, pintado de dourado nas barras.
//
// Aviso honesto: o carimbo vem do relógio de quem salvou. Num clube de amigos
// isso é suficiente; um relógio muito adiantado pode fazer o dourado durar
// mais do que devia.

import { limitarPct } from './formato'

export const JANELA_24H = 24 * 60 * 60 * 1000

// Guardamos um pouco mais que a janela para aguentar relógios tortos e
// permitir olhar o passado recente sem inflar o documento.
const JANELA_GUARDADA = 3 * JANELA_24H
const MAX_MARCACOES = 40
// Salvamentos em sequência (corrigindo a página, por exemplo) viram uma
// marcação só.
const AGRUPAR_ATE = 60 * 1000

function marcacaoValida(m) {
  return (
    m &&
    typeof m === 'object' &&
    Number.isFinite(Number(m.pct)) &&
    Number.isFinite(Number(m.em))
  )
}

// Normaliza e ordena da mais antiga para a mais recente.
export function ordenarHistorico(historico) {
  if (!Array.isArray(historico)) return []
  return historico
    .filter(marcacaoValida)
    .map((m) => ({ pct: limitarPct(m.pct), em: Number(m.em) }))
    .sort((a, b) => a.em - b.em)
}

// Descarta o que já não serve, MAS preserva a marcação imediatamente anterior
// ao corte: é ela que diz qual era a % antes da janela. Sem essa âncora o
// ganho recente ficaria superestimado.
function podar(lista, agora) {
  const corte = agora - JANELA_GUARDADA
  const antigas = lista.filter((m) => m.em < corte)
  const recentes = lista.filter((m) => m.em >= corte)
  const ancora = antigas.length ? [antigas[antigas.length - 1]] : []
  const podada = [...ancora, ...recentes]
  if (podada.length <= MAX_MARCACOES) return podada
  // Estourou o teto: mantém a âncora (primeira) e as marcações mais novas.
  return [podada[0], ...podada.slice(podada.length - (MAX_MARCACOES - 1))]
}

// Monta o histórico a ser gravado junto com um novo progresso.
//   historicoAnterior — o array já salvo (pode não existir)
//   pctAnterior       — a % que estava salva antes (null se é a 1ª vez)
//   pctNova           — a % sendo salva agora
export function montarHistorico(
  historicoAnterior,
  pctAnterior,
  pctNova,
  agora = Date.now()
) {
  let lista = ordenarHistorico(historicoAnterior)

  // Progresso criado antes desta funcionalidade: cria uma âncora com a % que
  // o membro já tinha, datada fora da janela. Assim só o ganho de agora conta
  // como leitura das últimas 24 h — e não a leitura inteira dele.
  if (!lista.length && pctAnterior != null) {
    lista = [{ pct: limitarPct(pctAnterior), em: agora - JANELA_24H - 60000 }]
  }

  const ultima = lista[lista.length - 1]
  if (ultima && agora - ultima.em < AGRUPAR_ATE) lista.pop()
  lista.push({ pct: limitarPct(pctNova), em: agora })

  return podar(lista, agora)
}

// % que o membro já tinha 24 h atrás.
export function pctAntesDaJanela(progresso, pctAtual, agora = Date.now()) {
  const lista = ordenarHistorico(progresso?.historico)
  // Sem histórico (progresso antigo, ainda não reescrito): não dá para saber
  // o que é recente, então tratamos tudo como acumulado — nada de dourado.
  if (!lista.length) return pctAtual

  const limite = agora - JANELA_24H
  let base = null
  for (const m of lista) {
    if (m.em > limite) break
    base = m.pct
  }
  // Nenhuma marcação anterior à janela: a primeira vez que ele registrou
  // progresso foi dentro dela, ou seja, leu tudo isso nas últimas 24 h.
  if (base == null) base = 0

  // Se o membro corrigiu a % para baixo, o "ganho" some (não pinta dourado).
  return Math.max(0, Math.min(base, pctAtual))
}

// Quando o membro cruzou os 100% pela primeira vez, segundo a trilha de
// marcações. Progresso antigo (gravado antes da trilha existir) não sabe
// dizer: devolve null e quem chama cai no `atualizadoEm` do documento.
export function quandoTerminou(progresso) {
  const marca = ordenarHistorico(progresso?.historico).find((m) => m.pct >= 100)
  return marca ? new Date(marca.em) : null
}

// Divide a % atual nas duas faixas desenhadas na barra:
//   base    — progresso acumulado, na cor do membro
//   recente — o que ele avançou nas últimas 24 h, em dourado
export function faixasDeProgresso(progresso, pctAtual, agora = Date.now()) {
  const pct = limitarPct(pctAtual)
  const base = pctAntesDaJanela(progresso, pct, agora)
  return { base, recente: Math.max(0, pct - base), total: pct }
}
