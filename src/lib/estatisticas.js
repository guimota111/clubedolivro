// Estatísticas do clube, tiradas do que já está gravado.
//
// Tudo aqui sai de `progresso` (um documento por membro por livro), dos
// livros do clube e dos perfis. Nada é gravado: são contas feitas na hora de
// mostrar, e por isso elas corrigem sozinhas o passado quando um dado novo
// chega (um `comecadoEm` que passou a ser salvo, por exemplo).
//
// O que cada data significa:
//   comecadoEm   — quando o membro marcou progresso naquele livro pela
//                  primeira vez. Gravado desde que o campo existe; para
//                  progresso mais antigo vale a marcação mais antiga que
//                  sobrou na trilha (que é podada, então é "no mínimo desde").
//   terminadoEm  — quando ele cruzou os 100%, pela trilha; sem trilha, o
//                  último `atualizadoEm` do documento.
//   inicioDoLivro — quando o clube começou aquele livro (`dataInicio` ou
//                  `iniciadoEm`).

import { pctDoProgresso, emMilissegundos, inicioDoLivro } from './formato'
import { ordenarHistorico, quandoTerminou } from './progresso24h'
import { descobrirVencedor } from './vencedor'

const DIA = 24 * 60 * 60 * 1000

// Quando este progresso começou, em milissegundos — ou null, se não dá para
// saber (progresso antigo, sem trilha).
export function quandoComecou(prog) {
  if (!prog) return null
  if (Number.isFinite(Number(prog.comecadoEm)) && prog.comecadoEm > 0) {
    return Number(prog.comecadoEm)
  }
  const primeira = ordenarHistorico(prog.historico)[0]
  return primeira ? primeira.em : null
}

// Quando cruzou os 100%, em milissegundos — ou null, se ainda não cruzou.
export function quandoTerminouMs(prog, totalPaginas = 0) {
  if (pctDoProgresso(prog, totalPaginas) < 100) return null
  const pelaTrilha = quandoTerminou(prog)
  if (pelaTrilha) return pelaTrilha.getTime()
  return emMilissegundos(prog?.atualizadoEm)
}

function media(valores) {
  const validos = valores.filter((v) => Number.isFinite(v))
  if (!validos.length) return null
  return validos.reduce((s, v) => s + v, 0) / validos.length
}

// ---------- Por livro ----------

// `porUsuario`: userId -> documento de progresso daquele livro.
// `membros`: a lista de membros do clube (para contar quem nem começou).
export function estatisticasDoLivro(livro, porUsuario = {}, membros = []) {
  const total = livro?.totalPaginas || 0
  const progressos = Object.values(porUsuario)

  // Quem cruzou os 100%, na ordem de chegada. Quem não sabe dizer a hora
  // (carimbo do servidor ainda não chegou) fica por último.
  const terminaram = progressos
    .filter((p) => pctDoProgresso(p, total) >= 100)
    .map((p) => ({ userId: p.userId, em: quandoTerminouMs(p, total) }))
    .sort((a, b) => (a.em ?? Infinity) - (b.em ?? Infinity))

  const terminaramIds = new Set(terminaram.map((t) => t.userId))
  const comecaram = progressos.filter(
    (p) => !terminaramIds.has(p.userId) && pctDoProgresso(p, total) > 0
  )
  const naoComecaram = membros.filter(
    (m) => !terminaramIds.has(m.id) && !comecaram.some((p) => p.userId === m.id)
  )

  // O vencedor da rodada: quem chegou mais longe e, no empate, primeiro. Em
  // livro terminado, é quem terminou primeiro.
  const vencedor = descobrirVencedor(progressos, total)

  return {
    terminaram, // [{ userId, em }] na ordem de chegada
    primeiro: terminaram[0] || null,
    quantosTerminaram: terminaram.length,
    quantosComecaram: comecaram.length,
    quantosNaoComecaram: naoComecaram.length,
    quantosLeitores: terminaram.length + comecaram.length,
    vencedor,
  }
}

// ---------- Por leitor ----------

// `livros`: TODOS os livros do clube (abertos, fila e encerrados — a coleção
// `livroAtual` inteira). `porLivro`: livroId -> (userId -> progresso).
export function estatisticasDoPato(userId, { livros = [], porLivro = {}, membros = [] }) {
  const meus = livros
    .map((livro) => {
      const doLivro = porLivro[livro.id] || {}
      const prog = doLivro[userId]
      if (!prog) return null
      const pct = pctDoProgresso(prog, livro.totalPaginas || 0)
      if (pct <= 0) return null
      const comecou = quandoComecou(prog)
      const terminou = quandoTerminouMs(prog, livro.totalPaginas || 0)
      const inicioClube = inicioDoLivro(livro)?.getTime() ?? null
      const stats = estatisticasDoLivro(livro, doLivro, membros)
      return {
        livro,
        prog,
        pct,
        comecou,
        terminou,
        // Quantos dias depois do clube começar este leitor abriu o livro.
        // Negativo = antes do clube (quem adiantou o da fila).
        atraso:
          comecou != null && inicioClube != null ? (comecou - inicioClube) / DIA : null,
        // Quantos dias levou do começo ao fim.
        duracao:
          comecou != null && terminou != null && terminou > comecou
            ? (terminou - comecou) / DIA
            : null,
        // Posição em que terminou (1 = primeiro), se terminou.
        posicao: terminou != null
          ? stats.terminaram.findIndex((t) => t.userId === userId) + 1 || null
          : null,
        venceu: !!stats.vencedor && stats.vencedor.userId === userId && stats.vencedor.pct >= 100,
      }
    })
    .filter(Boolean)

  const terminados = meus.filter((m) => m.terminou != null)
  const lendo = meus
    .filter((m) => m.terminou == null && m.livro.ativo === true)
    .sort((a, b) => (emMilissegundos(b.prog.atualizadoEm) || 0) - (emMilissegundos(a.prog.atualizadoEm) || 0))
  const adiantando = meus.filter((m) => m.terminou == null && m.livro.naFila === true)

  // Ritmo: % por dia, nos livros em que dá para medir. Nos terminados, a
  // duração inteira; nos abertos, do começo até agora.
  const agora = Date.now()
  const ritmos = meus
    .map((m) => {
      if (m.comecou == null) return null
      const fim = m.terminou ?? agora
      const dias = (fim - m.comecou) / DIA
      return dias >= 0.5 ? m.pct / dias : null
    })
    .filter((r) => r != null)

  return {
    livros: meus,
    terminados,
    lendo,
    adiantando,
    quantosTerminados: terminados.length,
    vitorias: meus.filter((m) => m.venceu).length,
    mediaDiasParaTerminar: media(terminados.map((m) => m.duracao)),
    atrasoMedio: media(meus.map((m) => m.atraso)),
    ritmoMedio: media(ritmos), // % por dia
    ultimaAtividade: Math.max(
      0,
      ...meus.map((m) => emMilissegundos(m.prog.atualizadoEm) || 0)
    ) || null,
  }
}

// "há 3 dias", "em 2 semanas" etc. para números de dias, arredondando.
export function diasPorExtenso(dias) {
  if (dias == null || !Number.isFinite(dias)) return ''
  const n = Math.abs(dias)
  if (n < 1) return 'menos de um dia'
  if (n < 14) {
    const d = Math.round(n)
    return `${d} ${d === 1 ? 'dia' : 'dias'}`
  }
  if (n < 60) {
    const s = Math.round(n / 7)
    return `${s} ${s === 1 ? 'semana' : 'semanas'}`
  }
  const m = Math.round(n / 30)
  return `${m} ${m === 1 ? 'mês' : 'meses'}`
}
