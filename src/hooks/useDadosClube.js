import { useMemo } from 'react'
import { collection, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useColecaoAoVivo } from './useColecaoAoVivo'

// Assina todos os membros do clube.
export function useMembros() {
  const { docs, carregando } = useColecaoAoVivo(
    () => collection(db, 'users'),
    []
  )
  return { membros: docs, carregando }
}

// Assina o livro atualmente ativo (pega o mais recente marcado como ativo).
export function useLivroAtual() {
  const { docs, carregando } = useColecaoAoVivo(
    () => query(collection(db, 'livroAtual'), where('ativo', '==', true)),
    []
  )
  // Se houver mais de um ativo por acaso, usa o mais recente.
  const livro = useMemo(() => {
    if (!docs.length) return null
    const ordenados = [...docs].sort((a, b) => {
      const ta = a.iniciadoEm?.seconds || 0
      const tb = b.iniciadoEm?.seconds || 0
      return tb - ta
    })
    return ordenados[0]
  }, [docs])
  return { livro, carregando }
}

// Assina o progresso de todos para um livro específico.
export function useProgresso(livroId) {
  const { docs, carregando } = useColecaoAoVivo(
    () =>
      livroId
        ? query(collection(db, 'progresso'), where('livroId', '==', livroId))
        : null,
    [livroId]
  )
  // Mapa userId -> documento de progresso (porcentagem/paginaAtual) completo.
  const porUsuario = useMemo(() => {
    const mapa = {}
    docs.forEach((d) => {
      mapa[d.userId] = d
    })
    return mapa
  }, [docs])
  return { progresso: docs, porUsuario, carregando }
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

// Assina as notas parciais de um livro, da mais recente à mais antiga.
export function useNotas(livroId) {
  const { docs, carregando } = useColecaoAoVivo(
    () =>
      livroId
        ? query(collection(db, 'notas'), where('livroId', '==', livroId))
        : null,
    [livroId]
  )
  const ordenadas = useMemo(
    () =>
      [...docs].sort(
        (a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0)
      ),
    [docs]
  )
  return { notas: ordenadas, carregando }
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
