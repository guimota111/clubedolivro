// Novidades do clube: o que aconteceu por aqui, do mais recente ao mais antigo.
//
// Nada disso é gravado no Firestore — a lista é montada no cliente a partir do
// que o app já assina ao vivo (notas, resenhas, comentários e progresso). Assim
// não há uma coleção de eventos para manter em dia, e o aviso nunca discorda do
// resto da tela.

import { ondeNoLivro, limitarPct } from './formato'
import { verboReacao } from './reacoes'

const TETO = 60

// Timestamps do Firestore viram milissegundos; o que não tiver data fica de
// fora (documento recém-criado ainda sem o carimbo do servidor).
function emMs(ts) {
  if (!ts) return null
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  if (ts instanceof Date) return ts.getTime()
  return null
}

function nomeDe(membrosPorId, userId) {
  return membrosPorId[userId]?.nome || 'Alguém'
}

// Uma nota vira o aviso mais expressivo do feed: a reação conta o que a pessoa
// sentiu e onde. Sem reação conhecida, sobra o aviso seco de que há nota nova.
function textoDaNota(nota, nome) {
  const onde = ondeNoLivro(nota)
  const verbo = verboReacao(nota.emoji)
  const temTexto = !!(nota.texto || '').trim()

  if (verbo) {
    return temTexto
      ? `${nome} ${verbo} ${onde} e deixou uma nota.`
      : `${nome} ${verbo} ${onde}.`
  }
  return temTexto
    ? `${nome} deixou uma nota ${onde}.`
    : `${nome} reagiu ${onde}.`
}

export function montarAtividades({
  notas = [],
  resenhas = [],
  comentarios = [],
  progresso = [],
  membrosPorId = {},
  livroAtual = null,
  tituloPorLivroId = {},
}) {
  const eventos = []

  notas.forEach((n) => {
    const em = emMs(n.criadoEm)
    if (em == null) return
    eventos.push({
      id: `nota-${n.id}`,
      tipo: 'nota',
      em,
      userId: n.userId,
      emoji: n.emoji || '',
      texto: textoDaNota(n, nomeDe(membrosPorId, n.userId)),
    })
  })

  resenhas.forEach((r) => {
    const em = emMs(r.atualizadoEm)
    if (em == null) return
    const titulo = tituloPorLivroId[r.livroId]
    eventos.push({
      id: `resenha-${r.id}`,
      tipo: 'resenha',
      em,
      userId: r.userId,
      emoji: '📝',
      texto: titulo
        ? `${nomeDe(membrosPorId, r.userId)} escreveu uma resenha de ${titulo}.`
        : `${nomeDe(membrosPorId, r.userId)} escreveu uma resenha.`,
    })
  })

  comentarios.forEach((c) => {
    const em = emMs(c.criadoEm)
    if (em == null) return
    eventos.push({
      id: `comentario-${c.id}`,
      tipo: 'comentario',
      em,
      userId: c.userId,
      emoji: '💬',
      texto: `${nomeDe(membrosPorId, c.userId)} comentou em uma ${
        c.alvoTipo === 'resenha' ? 'resenha' : 'nota parcial'
      }.`,
    })
  })

  // Progresso é um documento por membro por livro, sobrescrito a cada
  // atualização — então rende no máximo um aviso por pessoa, não uma enxurrada.
  progresso.forEach((p) => {
    const em = emMs(p.atualizadoEm)
    if (em == null) return
    const pct = limitarPct(
      typeof p.porcentagem === 'number' ? p.porcentagem : 0
    )
    const nome = nomeDe(membrosPorId, p.userId)
    eventos.push({
      id: `progresso-${p.id}`,
      tipo: 'progresso',
      em,
      userId: p.userId,
      emoji: pct >= 100 ? '🏁' : '📖',
      texto:
        pct >= 100
          ? `${nome} terminou${livroAtual?.titulo ? ` ${livroAtual.titulo}` : ' o livro'}!`
          : `${nome} chegou a ${pct}% da leitura.`,
    })
  })

  return eventos.sort((a, b) => b.em - a.em).slice(0, TETO)
}

// Quantos avisos são mais novos que a última visita à aba.
export function contarNaoVistas(atividades, vistoAte) {
  if (!vistoAte) return atividades.length
  return atividades.filter((a) => a.em > vistoAte).length
}
