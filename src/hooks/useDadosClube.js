import { useMemo } from 'react'
import { collection, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useColecaoAoVivo } from './useColecaoAoVivo'
import { ordenarSerie } from '../lib/series'

// O operador `in` do Firestore aceita no máximo 30 valores por consulta — de
// sobra para uma série, mas o corte fica explícito para não virar erro mudo.
const TETO_IN = 30

// Assina todos os membros do clube.
export function useMembros() {
  const { docs, carregando } = useColecaoAoVivo(
    () => collection(db, 'users'),
    []
  )
  return { membros: docs, carregando }
}

// Assina os livros em leitura. Normalmente é um só; quando o clube está numa
// série, são vários ao mesmo tempo — e aí vêm na ordem dos volumes, do
// primeiro ao último, que é como o leitor os procura na tela.
export function useLivrosAtuais() {
  const { docs, carregando } = useColecaoAoVivo(
    () => query(collection(db, 'livroAtual'), where('ativo', '==', true)),
    []
  )
  const livros = useMemo(() => ordenarSerie(docs), [docs])
  return { livros, carregando }
}

// Assina o livro que está na fila para ser o próximo do clube. Ele vive na
// mesma coleção do livro atual, marcado com `naFila` — documentos antigos não
// têm o campo, e por isso ficam de fora da consulta.
export function useProximoLivro() {
  const { docs, carregando } = useColecaoAoVivo(
    () => query(collection(db, 'livroAtual'), where('naFila', '==', true)),
    []
  )
  // Se houver mais de um na fila por acaso, vale o mais recente.
  const proximo = useMemo(() => {
    if (!docs.length) return null
    const ordenados = [...docs].sort(
      (a, b) => (b.iniciadoEm?.seconds || 0) - (a.iniciadoEm?.seconds || 0)
    )
    return ordenados[0]
  }, [docs])
  return { proximo, carregando }
}

// Assina o progresso de todos nos livros indicados — os que estão em leitura
// (podem ser vários, se for uma série) mais o que está na fila. Uma consulta
// só para todos eles: o clube é pequeno e assim a corrida de cada volume, a
// régua do seletor e a aba de novidades bebem da mesma fonte.
export function useProgressoDeLivros(livroIds = []) {
  const ids = livroIds.filter(Boolean).slice(0, TETO_IN)
  const chave = ids.join(',')
  const { docs, carregando } = useColecaoAoVivo(
    () =>
      ids.length
        ? query(collection(db, 'progresso'), where('livroId', 'in', ids))
        : null,
    [chave]
  )
  // Mapa livroId -> (userId -> documento de progresso completo).
  const porLivro = useMemo(() => {
    const mapa = {}
    docs.forEach((d) => {
      ;(mapa[d.livroId] = mapa[d.livroId] || {})[d.userId] = d
    })
    return mapa
  }, [docs])
  return { progresso: docs, porLivro, carregando }
}

// Assina o mural de recados, do mais recente ao mais antigo.
export function useMural() {
  const { docs, carregando } = useColecaoAoVivo(
    () => query(collection(db, 'mural'), orderBy('criadoEm', 'desc')),
    []
  )
  return { recados: docs, carregando }
}

// Assina o histórico de livros encerrados, do mais recente ao mais antigo.
export function useHistorico() {
  const { docs, carregando } = useColecaoAoVivo(
    () => query(collection(db, 'historicoLivros'), orderBy('encerradoEm', 'desc')),
    []
  )
  return { historico: docs, carregando }
}

// Assina todas as resenhas (o clube é pequeno). Mapa livroId -> lista.
export function useResenhas() {
  const { docs, carregando } = useColecaoAoVivo(
    () => collection(db, 'resenhas'),
    []
  )
  const porLivro = useMemo(() => {
    const mapa = {}
    docs.forEach((r) => {
      ;(mapa[r.livroId] = mapa[r.livroId] || []).push(r)
    })
    return mapa
  }, [docs])
  return { resenhas: docs, porLivro, carregando }
}

// Assina as notas parciais dos livros indicados, da mais recente à mais antiga.
// São vários porque uma série tem vários livros abertos ao mesmo tempo: cada um
// guarda as suas notas, e o mapa por livro entrega a lista certa a quem está
// olhando aquele volume.
export function useNotasDeLivros(livroIds = []) {
  const ids = livroIds.filter(Boolean).slice(0, TETO_IN)
  const chave = ids.join(',')
  const { docs, carregando } = useColecaoAoVivo(
    () =>
      ids.length
        ? query(collection(db, 'notas'), where('livroId', 'in', ids))
        : null,
    [chave]
  )
  const ordenadas = useMemo(
    () =>
      [...docs].sort(
        (a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0)
      ),
    [docs]
  )
  const porLivro = useMemo(() => {
    const mapa = {}
    ordenadas.forEach((n) => {
      ;(mapa[n.livroId] = mapa[n.livroId] || []).push(n)
    })
    return mapa
  }, [ordenadas])
  return { notas: ordenadas, porLivro, carregando }
}

// Assina todos os comentários (o clube é pequeno). Mapa alvoId -> lista
// ordenada do mais antigo ao mais novo (leitura natural de conversa).
export function useComentarios() {
  const { docs, carregando } = useColecaoAoVivo(
    () => collection(db, 'comentarios'),
    []
  )
  const porAlvo = useMemo(() => {
    const mapa = {}
    docs.forEach((c) => {
      ;(mapa[c.alvoId] = mapa[c.alvoId] || []).push(c)
    })
    Object.values(mapa).forEach((lista) =>
      lista.sort((a, b) => (a.criadoEm?.seconds || 0) - (b.criadoEm?.seconds || 0))
    )
    return mapa
  }, [docs])
  // A lista plana alimenta a aba de novidades; o mapa, as threads.
  return { comentarios: docs, porAlvo, carregando }
}

// Assina o progresso do membro atual em TODOS os livros (para saber quais ele
// já terminou, na aba de resenhas).
export function useMeuProgresso(userId) {
  const { docs, carregando } = useColecaoAoVivo(
    () =>
      userId
        ? query(collection(db, 'progresso'), where('userId', '==', userId))
        : null,
    [userId]
  )
  const porLivro = useMemo(() => {
    const mapa = {}
    docs.forEach((p) => {
      mapa[p.livroId] = p
    })
    return mapa
  }, [docs])
  return { porLivro, carregando }
}
