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
    // `livroId` diz à aba de resenhas qual livro abrir: ela mostra uma
    // prateleira de capas, e sem isso o aviso pararia na prateleira.
    return {
      aba: 'resenhas',
      tipo: 'resenha',
      id: c.alvoId,
      livroId: alvo.livroId,
      comentarios: true,
    }
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

// ---------- A eleição do próximo livro ----------
//
// Os avisos da eleição não dizem quem fez o quê: quem indicou é segredo até a
// apuração, e um aviso "Fulano indicou…" entregaria tudo.

export function textoEleicaoAberta(nome) {
  return `A Patoteca abriu uma eleição para o próximo livro${nome ? ` (${nome})` : ''}. Indique até 2 livros e vote!`
}

export function textoIndicacaoNova(titulo) {
  return `Um livro novo entrou na eleição: ${titulo}.`
}

export function textoIndicacaoAlterada(titulo) {
  return `A indicação de ${titulo} foi corrigida. Quem tinha votado nela precisa votar de novo.`
}

export function textoNovoTurno(turno, titulos) {
  return `Empate na eleição! ${turno}º turno aberto entre ${titulos}. Vote de novo.`
}

// `eleitos`: [{ titulo, nome }], na ordem da fila. Aceita também o par antigo
// (titulo, nome) de um eleito só.
export function textoResultado(eleitos, nome) {
  const lista = Array.isArray(eleitos) ? eleitos : [{ titulo: eleitos, nome }]
  const descrever = (e) => `${e.titulo}${e.nome ? ` (indicação de ${e.nome})` : ''}`
  if (lista.length <= 1) {
    const e = lista[0] || { titulo: '' }
    return `A Patoteca elegeu ${e.titulo} como o próximo livro${e.nome ? ` — indicação de ${e.nome}` : ''}! Ele já está na fila.`
  }
  const partes = lista.map(descrever)
  const nomes = `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
  return `A Patoteca elegeu ${nomes}! Os ${lista.length} já estão na fila, nessa ordem.`
}

export function montarAtividades({
  notas = [],
  resenhas = [],
  comentarios = [],
  progresso = [],
  eleicoes = [],
  indicacoes = [],
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
        ? { aba: 'resenhas', tipo: 'resenha', id: r.id, livroId: r.livroId }
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

  // A eleição: a abertura, cada livro indicado (sem dizer por quem), os turnos
  // de desempate e o resultado. Nada disso tem autor à mostra — os eventos
  // saem com `anonimo` e a aba desenha a urna no lugar do retrato.
  const indicacoesPorId = {}
  indicacoes.forEach((i) => {
    indicacoesPorId[i.id] = i
  })
  // Uma eleição cancelada sai de cena por inteiro: os avisos dela levariam a
  // uma tela que não existe mais.
  const eleicoesVivas = eleicoes.filter((e) => e.status !== 'cancelada')
  const eleicoesPorId = {}
  eleicoesVivas.forEach((e) => {
    eleicoesPorId[e.id] = e
  })

  eleicoesVivas.forEach((e) => {
    const em = emMs(e.criadoEm)
    if (em != null) {
      eventos.push({
        id: `eleicao-${e.id}`,
        tipo: 'eleicao',
        em,
        anonimo: true,
        emoji: '🗳️',
        texto: textoEleicaoAberta(e.nome),
        destino: { aba: 'eleicao', tipo: 'eleicao', id: e.id },
      })
    }

    // Cada apuração vira um aviso: empate (com o turno que abriu) ou o
    // resultado final.
    ;(Array.isArray(e.apuracoes) ? e.apuracoes : []).forEach((ap) => {
      if (typeof ap.em !== 'number') return
      const empatados = (ap.empatados || []).map((id) => indicacoesPorId[id]).filter(Boolean)
      if (empatados.length > 1) {
        eventos.push({
          id: `apuracao-${e.id}-${ap.turno}`,
          tipo: 'eleicao',
          em: ap.em,
          anonimo: true,
          emoji: '⚖️',
          texto: textoNovoTurno((ap.turno || 1) + 1, listarTitulos(empatados)),
          destino: { aba: 'eleicao', tipo: 'eleicao', id: e.id },
        })
      }
    })

    if (e.status === 'encerrada' && e.vencedorIndicacaoId) {
      const ids = Array.isArray(e.vencedoresIndicacaoIds) && e.vencedoresIndicacaoIds.length
        ? e.vencedoresIndicacaoIds
        : [e.vencedorIndicacaoId]
      const eleitas = ids.map((id) => indicacoesPorId[id]).filter(Boolean)
      const em = emMs(e.encerradaEm)
      if (eleitas.length && em != null) {
        eventos.push({
          id: `resultado-${e.id}`,
          tipo: 'eleicao',
          em,
          anonimo: true,
          emoji: '🏆',
          texto: textoResultado(
            eleitas.map((i) => ({ titulo: i.titulo, nome: nomeDe(membrosPorId, i.userId) }))
          ),
          destino: { aba: 'eleicao', tipo: 'eleicao', id: e.id },
        })
      }
    }
  })

  // Uma indicação é um documento só, reescrito a cada correção — então rende
  // um aviso por livro: "entrou" ou, se foi mexida depois, "foi corrigida".
  indicacoes.forEach((i) => {
    if (!eleicoesPorId[i.eleicaoId]) return
    const criada = emMs(i.criadoEm)
    const mexida = emMs(i.atualizadoEm)
    const em = mexida ?? criada
    if (em == null) return
    const corrigida = criada != null && mexida != null && mexida - criada > 60000
    eventos.push({
      id: `indicacao-${i.id}`,
      tipo: 'indicacao',
      em,
      anonimo: true,
      emoji: '📚',
      texto: corrigida ? textoIndicacaoAlterada(i.titulo) : textoIndicacaoNova(i.titulo),
      destino: { aba: 'eleicao', tipo: 'indicacao', id: i.id, eleicaoId: i.eleicaoId },
    })
  })

  return eventos.sort((a, b) => b.em - a.em).slice(0, TETO)
}

// "A Sombra do Vento e O Jogo do Anjo" — para caber numa frase.
function listarTitulos(indicacoes) {
  const titulos = indicacoes.map((i) => `“${i.titulo}”`)
  if (titulos.length <= 1) return titulos[0] || ''
  return `${titulos.slice(0, -1).join(', ')} e ${titulos[titulos.length - 1]}`
}

// Quantos avisos são mais novos que a última visita à aba.
export function contarNaoVistas(atividades, vistoAte) {
  if (!vistoAte) return atividades.length
  return atividades.filter((a) => a.em > vistoAte).length
}
