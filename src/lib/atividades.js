// Novidades do clube: o que aconteceu por aqui, do mais recente ao mais antigo.
//
// Nada disso é gravado no Firestore — a lista é montada no cliente a partir do
// que o app já assina ao vivo (notas, resenhas, comentários e progresso). Assim
// não há uma coleção de eventos para manter em dia, e o aviso nunca discorda do
// resto da tela.

import { ondeNoLivro, limitarPct, emMilissegundos as emMs } from './formato'
import { verboReacao } from './reacoes'

const TETO = 60

// Timestamps viram milissegundos (`emMs`); o que não tiver data fica de fora
// dos avisos — documento recém-criado ainda sem o carimbo do servidor.

function nomeDe(membrosPorId, userId) {
  return membrosPorId[userId]?.nome || 'Alguém'
}

// Uma nota vira o aviso mais expressivo do feed: a reação conta o que a pessoa
// sentiu e onde. Sem reação conhecida, sobra o aviso seco de que há nota nova.
//
// `livro` só entra quando o clube tem mais de um aberto: numa série, "40%" sem
// dizer de qual volume não localiza ninguém.
export function textoDaNota(nota, nome, livro) {
  const onde = ondeNoLivro(nota)
  const em = livro ? ` de ${livro}` : ''
  const verbo = verboReacao(nota.emoji)
  const temTexto = !!(nota.texto || '').trim()

  if (verbo) {
    return temTexto
      ? `${nome} ${verbo} ${onde}${em} e deixou uma nota.`
      : `${nome} ${verbo} ${onde}${em}.`
  }
  return temTexto
    ? `${nome} deixou uma nota ${onde}${em}.`
    : `${nome} reagiu ${onde}${em}.`
}

// Para onde cada aviso leva ao ser clicado. `null` = aviso sem destino, que o
// feed desenha como texto simples em vez de botão — melhor que um clique que
// não faz nada.
//
// `livrosResenhaveis` são os livros que ESTE membro terminou: só neles a lista
// de resenhas existe na tela, então só neles o clique tem para onde ir.
function destinoDoComentario(c, notasNaTela, resenhasPorId, livrosResenhaveis) {
  if (c.alvoTipo === 'resenha') {
    const alvo = resenhasPorId[c.alvoId]
    if (!alvo || !livrosResenhaveis.has(alvo.livroId)) return null
    return { aba: 'resenhas', tipo: 'resenha', id: c.alvoId, comentarios: true }
  }
  const nota = notasNaTela.get(c.alvoId)
  if (!nota) return null
  // `livroId` faz a tela trocar para o volume da nota antes de rolar até ela.
  return {
    aba: 'leitura',
    tipo: 'nota',
    id: c.alvoId,
    livroId: nota.livroId,
    comentarios: true,
  }
}

// As frases abaixo aparecem em dois lugares: aqui, no feed de novidades, e na
// notificação que chega no celular (`src/lib/push.js`). Ficam como funções para
// que as duas telas nunca contem a mesma coisa com palavras diferentes.

export function textoDoComentario(nome, alvoTipo) {
  return `${nome} comentou em uma ${alvoTipo === 'resenha' ? 'resenha' : 'nota parcial'}.`
}

export function textoDaResenha(nome, titulo) {
  return titulo
    ? `${nome} escreveu uma resenha de ${titulo}.`
    : `${nome} escreveu uma resenha.`
}

export function textoDoProgresso(nome, pct, { titulo = '', onde = '' } = {}) {
  return pct >= 100
    ? `${nome} terminou${titulo ? ` ${titulo}` : ' o livro'}!`
    : `${nome} chegou a ${pct}%${onde ? ` de ${onde}` : ' da leitura'}.`
}

export function montarAtividades({
  notas = [],
  resenhas = [],
  comentarios = [],
  progresso = [],
  membrosPorId = {},
  tituloPorLivroId = {},
  livrosResenhaveis = new Set(),
  // Com uma série aberta, cada aviso diz de qual livro está falando. Com um
  // livro só, dizer o título em toda linha seria repetição.
  nomearLivro = false,
}) {
  const eventos = []
  // Comentário em nota de livro que saiu de cartaz não tem para onde levar: a
  // lista de notas só mostra as dos livros abertos.
  const notasNaTela = new Map(notas.map((n) => [n.id, n]))
  const tituloDe = (livroId) => (nomearLivro ? tituloPorLivroId[livroId] || '' : '')
  const resenhasPorId = {}
  resenhas.forEach((r) => {
    resenhasPorId[r.id] = r
  })

  notas.forEach((n) => {
    const em = emMs(n.criadoEm)
    if (em == null) return
    eventos.push({
      id: `nota-${n.id}`,
      tipo: 'nota',
      em,
      userId: n.userId,
      emoji: n.emoji || '',
      texto: textoDaNota(n, nomeDe(membrosPorId, n.userId), tituloDe(n.livroId)),
      destino: { aba: 'leitura', tipo: 'nota', id: n.id, livroId: n.livroId },
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
      texto: textoDaResenha(nomeDe(membrosPorId, r.userId), titulo),
      destino: livrosResenhaveis.has(r.livroId)
        ? { aba: 'resenhas', tipo: 'resenha', id: r.id }
        : null,
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
      texto: textoDoComentario(nomeDe(membrosPorId, c.userId), c.alvoTipo),
      // O clique abre a conversa direto, já que é ela o assunto do aviso.
      destino: destinoDoComentario(c, notasNaTela, resenhasPorId, livrosResenhaveis),
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
    // No fim da leitura o título vai sempre — é a frase que o clube comemora.
    const titulo = tituloPorLivroId[p.livroId] || ''
    const onde = tituloDe(p.livroId)
    eventos.push({
      id: `progresso-${p.id}`,
      tipo: 'progresso',
      em,
      userId: p.userId,
      emoji: pct >= 100 ? '🏁' : '📖',
      texto: textoDoProgresso(nome, pct, { titulo, onde }),
      destino: { aba: 'leitura', tipo: 'corrida', id: 'corrida', livroId: p.livroId },
    })
  })

  return eventos.sort((a, b) => b.em - a.em).slice(0, TETO)
}

// Quantos avisos são mais novos que a última visita à aba.
export function contarNaoVistas(atividades, vistoAte) {
  if (!vistoAte) return atividades.length
  return atividades.filter((a) => a.em > vistoAte).length
}
