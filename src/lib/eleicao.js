// A eleição do próximo livro: as regras, sem tela e sem banco.
//
// Como funciona: qualquer membro indica até dois livros, cada um com um texto
// defendendo a escolha, e vota em até dois dos livros indicados — nunca nos
// próprios. Indicar e votar acontecem ao mesmo tempo, e os dois podem ser
// mudados à vontade enquanto a eleição está aberta. Ninguém vê quem indicou o
// quê nem quantos votos cada livro tem: isso só aparece na apuração, feita por
// quem tem a senha da urna, na frente do clube — voto a voto, com o nome de
// quem votou. Uma eleição elege uma ou mais VAGAS (hoje, dois livros): os mais
// votados entram na fila na ordem da votação. Empate na beira do corte abre um
// novo turno só entre os empatados, pelas vagas que sobraram. Os eleitos
// entram na fila do próximo livro, um atrás do outro.

import { prazoParaData } from './formato'

export const INDICACOES_POR_PESSOA = 2
export const LIMITE_TEXTO_INDICACAO = 2000
// Depois de encerrada, a aba da eleição ainda fica à mostra por um tempo, para
// o resultado não sumir no dia seguinte.
export const DIAS_EM_CARTAZ = 30

// Quantos livros uma eleição elege. As eleições abertas antes de existir a
// escolha não têm o campo: vale 1, como sempre foi — a não ser que a urna
// diga outra coisa na hora de apurar (`vagas` da apuração).
export const VAGAS_PADRAO = 2
export const VAGAS_MAXIMO = 3

export function vagasDaEleicao(eleicao) {
  const n = Number(eleicao?.vagas)
  return Number.isInteger(n) && n >= 1 ? Math.min(n, VAGAS_MAXIMO) : 1
}

// Os livros já eleitos em turnos anteriores (ids de indicação), na ordem em
// que entraram. Um turno de desempate disputa só as vagas que sobraram.
export function eleitosAnteriores(eleicao) {
  return Array.isArray(eleicao?.eleitos) ? eleicao.eleitos : []
}

export function vagasRestantes(eleicao) {
  return Math.max(0, vagasDaEleicao(eleicao) - eleitosAnteriores(eleicao).length)
}

// Quantos votos cada pessoa tem num turno. No primeiro, dois; nos seguintes,
// que só existem para desempatar, tantos quantas forem as vagas em jogo —
// normalmente um: com dois votos e dois finalistas todo mundo votaria nos
// dois e o empate nunca acabaria.
export function votosPorPessoa(turno = 1, vagas = 1) {
  return turno > 1 ? Math.max(1, vagas) : 2
}

// ---------- Situação ----------

export function emAndamento(eleicao) {
  return !!eleicao && (eleicao.status === 'aberta' || eleicao.status === 'empatada')
}

// A eleição em curso (no máximo uma) e as já terminadas, da mais recente à
// mais antiga.
export function separarEleicoes(eleicoes = []) {
  const atual =
    [...eleicoes]
      .filter(emAndamento)
      .sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm))[0] || null
  const passadas = eleicoes
    .filter((e) => !emAndamento(e))
    .sort((a, b) => ms(b.encerradaEm || b.criadoEm) - ms(a.encerradaEm || a.criadoEm))
  return { atual, passadas }
}

// A aba aparece com eleição aberta ou com uma encerrada há pouco.
export function eleicaoEmCartaz(eleicoes = [], agora = Date.now()) {
  const { atual, passadas } = separarEleicoes(eleicoes)
  if (atual) return true
  const ultima = passadas[0]
  if (!ultima || ultima.status !== 'encerrada') return false
  const em = ms(ultima.encerradaEm)
  return !!em && agora - em < DIAS_EM_CARTAZ * 86400000
}

function prazoVencido(iso, agora) {
  const data = prazoParaData(iso)
  return !!data && data.getTime() < agora
}

// Dá para indicar? Só no primeiro turno — os seguintes são para desempatar o
// que já está na mesa — e dentro do prazo, quando há um.
export function indicacoesAbertas(eleicao, agora = Date.now()) {
  if (!eleicao || eleicao.status !== 'aberta') return false
  if ((eleicao.turno || 1) > 1) return false
  return !prazoVencido(eleicao.prazoIndicacoes, agora)
}

export function votacaoAberta(eleicao, agora = Date.now()) {
  if (!eleicao || eleicao.status !== 'aberta') return false
  return !prazoVencido(eleicao.prazoVotacao, agora)
}

// ---------- Indicações ----------

// Os livros que estão na disputa neste turno: todos no primeiro, só os
// finalistas depois do empate.
export function indicacoesEmDisputa(eleicao, indicacoes = []) {
  if (!eleicao) return []
  const daEleicao = indicacoes.filter((i) => i.eleicaoId === eleicao.id)
  const turno = eleicao.turno || 1
  if (turno > 1 && Array.isArray(eleicao.finalistas) && eleicao.finalistas.length) {
    const finalistas = new Set(eleicao.finalistas)
    return daEleicao.filter((i) => finalistas.has(i.id))
  }
  return daEleicao
}

// Chave para comparar títulos: sem acento, sem caixa, sem pontuação. "Dom
// Casmurro" e "dom casmurro." são o mesmo livro; "Dom Casmurro 2" não é.
export function chaveTitulo(titulo) {
  return (titulo || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

// Já tem alguém com este livro na eleição? Compara pelo id da fonte (quando
// os dois vieram da mesma busca) ou pelo título.
export function indicacaoRepetida(indicacoes = [], { titulo, fonteId }, ignorarId = null) {
  const chave = chaveTitulo(titulo)
  return (
    indicacoes.find(
      (i) =>
        i.id !== ignorarId &&
        ((fonteId && i.fonteId && i.fonteId === fonteId) ||
          (chave && chaveTitulo(i.titulo) === chave))
    ) || null
  )
}

// A ordem das capas na prateleira. Por data de indicação entregaria quem
// indicou (quem chegou primeiro na reunião indicou primeiro); alfabética
// favorece o A. Então é embaralhada — mas a MESMA para todo mundo e em toda
// visita, porque a ordem sai de um resumo do id da eleição com o da indicação.
export function embaralharFixo(indicacoes = [], semente = '') {
  return [...indicacoes]
    .map((i) => ({ i, peso: resumoNumerico(`${semente}:${i.id}`) }))
    .sort((a, b) => a.peso - b.peso || a.i.id.localeCompare(b.i.id))
    .map(({ i }) => i)
}

// FNV-1a de 32 bits: pequeno, determinístico e suficiente para embaralhar.
function resumoNumerico(texto) {
  let h = 0x811c9dc5
  for (let k = 0; k < texto.length; k++) {
    h ^= texto.charCodeAt(k)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

// ---------- Votos ----------

// Os votos de um turno, um documento por pessoa, já limpos: só ids de livros
// em disputa, sem repetição, sem voto no próprio livro e dentro do limite.
// Limpar aqui faz a apuração não depender de o cliente ter se comportado.
export function votosValidos(votos = [], eleicao, indicacoes = []) {
  if (!eleicao) return []
  const turno = eleicao.turno || 1
  const emDisputa = new Map(indicacoesEmDisputa(eleicao, indicacoes).map((i) => [i.id, i]))
  const limite = votosPorPessoa(turno, vagasRestantes(eleicao))
  return votos
    .filter((v) => v.eleicaoId === eleicao.id && (v.turno || 1) === turno)
    .map((v) => {
      const escolhas = []
      ;(Array.isArray(v.indicacoes) ? v.indicacoes : []).forEach((id) => {
        const ind = emDisputa.get(id)
        if (!ind || ind.userId === v.userId || escolhas.includes(id)) return
        if (escolhas.length < limite) escolhas.push(id)
      })
      return { ...v, indicacoes: escolhas }
    })
}

// As cédulas de um turno, na ordem em que saem da urna: uma por voto (uma
// pessoa com dois votos rende duas cédulas, uma atrás da outra). A ordem das
// pessoas é embaralhada — a MESMA em toda abertura da urna, porque sai de um
// resumo do id da eleição com o turno — para a contagem não entregar quem
// chegou primeiro e para a revelação poder ser retomada do ponto em que parou.
export function cedulas(votos = [], eleicao, indicacoes = []) {
  if (!eleicao) return []
  const turno = eleicao.turno || 1
  const validos = votosValidos(votos, eleicao, indicacoes).filter((v) => v.indicacoes.length)
  const pessoas = [...validos]
    .map((v) => ({ v, peso: resumoNumerico(`${eleicao.id}:${turno}:${v.userId}`) }))
    .sort((a, b) => a.peso - b.peso || a.v.userId.localeCompare(b.v.userId))
    .map(({ v }) => v)
  const lista = []
  pessoas.forEach((v) => {
    v.indicacoes.forEach((indicacaoId, k) => {
      lista.push({ userId: v.userId, indicacaoId, ultimaDaPessoa: k === v.indicacoes.length - 1 })
    })
  })
  return lista
}

// A contagem parcial depois de reveladas as primeiras `reveladas` cédulas —
// é o placar que vai se mexendo durante a apuração.
export function contagemParcial(cedulasDoTurno = [], reveladas = 0, emDisputa = []) {
  const totais = {}
  emDisputa.forEach((i) => {
    totais[i.id] = 0
  })
  cedulasDoTurno.slice(0, reveladas).forEach((c) => {
    totais[c.indicacaoId] = (totais[c.indicacaoId] || 0) + 1
  })
  return totais
}

// A apuração de um turno: quantos votos cada livro recebeu, a lista ordenada
// (do mais votado ao menos), quem ficou eleito e quem empatou na beira do
// corte.
//
// `vagas` é quantos livros ainda faltam eleger neste turno. Andando do mais
// votado para o menos, cada grupo de livros com a mesma contagem entra inteiro
// se couber nas vagas que sobram; o primeiro grupo que não cabe é o empate, e
// a apuração para ali — o que vem abaixo dele não concorre mais. Livro sem
// nenhum voto nunca é eleito sozinho: se ainda há vaga e só sobrou gente com
// zero, eles ficam "empatados" para o clube decidir (ou abrir outro turno).
export function apurar(votos = [], eleicao, indicacoes = [], vagas = vagasRestantes(eleicao)) {
  const emDisputa = indicacoesEmDisputa(eleicao, indicacoes)
  const totais = {}
  emDisputa.forEach((i) => {
    totais[i.id] = 0
  })
  const validos = votosValidos(votos, eleicao, indicacoes)
  let votantes = 0
  validos.forEach((v) => {
    if (!v.indicacoes.length) return
    votantes += 1
    v.indicacoes.forEach((id) => {
      totais[id] = (totais[id] || 0) + 1
    })
  })
  return classificar({ emDisputa, totais, votantes, vagas })
}

// A parte da apuração que não depende de contar: dada a contagem, quem entra
// e quem empata. Separada para a tela remontar o mesmo resultado a partir de
// uma apuração já gravada.
export function classificar({ emDisputa = [], totais = {}, votantes = 0, vagas = 1 }) {
  const ordenados = [...emDisputa].sort(
    (a, b) => (totais[b.id] || 0) - (totais[a.id] || 0) || a.titulo.localeCompare(b.titulo, 'pt-BR')
  )
  const maior = ordenados.length ? totais[ordenados[0].id] || 0 : 0

  const eleitos = []
  let empatados = []
  let restantes = Math.max(0, vagas)
  let k = 0
  while (k < ordenados.length && restantes > 0) {
    const n = totais[ordenados[k].id] || 0
    const grupo = []
    while (k < ordenados.length && (totais[ordenados[k].id] || 0) === n) grupo.push(ordenados[k++])
    if (n === 0 || grupo.length > restantes) {
      empatados = grupo
      break
    }
    eleitos.push(...grupo)
    restantes -= grupo.length
  }

  // Completa quando não sobrou vaga, ou quando sobrou mas não há empate a
  // resolver (menos livros do que vagas, por exemplo).
  const completa = !empatados.length
  const vencedor = completa && eleitos.length ? eleitos[0] : null

  return { totais, ordenados, votantes, maior, eleitos, empatados, restantes, completa, vencedor }
}

// Quantas pessoas já votaram neste turno (gastando pelo menos um voto).
export function contarVotantes(votos = [], eleicao, indicacoes = []) {
  return votosValidos(votos, eleicao, indicacoes).filter((v) => v.indicacoes.length).length
}

// Id do documento de voto: um por pessoa por turno. Mudar o voto é
// sobrescrever o próprio documento.
export function idDoVoto(eleicaoId, turno, userId) {
  return `${eleicaoId}_${turno || 1}_${userId}`
}

// ---------- Utilidades ----------

function ms(ts) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  if (typeof ts === 'number') return ts
  return 0
}

// "1º" / "2º" — a posição de um livro na fila dos eleitos.
export function ordinal(n) {
  return `${n}º`
}

// "A Sombra do Vento e O Jogo do Anjo" — para caber numa frase.
export function listarTitulos(indicacoes = []) {
  const titulos = indicacoes.map((i) => `“${i.titulo}”`)
  if (titulos.length <= 1) return titulos[0] || ''
  return `${titulos.slice(0, -1).join(', ')} e ${titulos[titulos.length - 1]}`
}
