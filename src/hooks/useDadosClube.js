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
  // Mapa userId -> paginaAtual para acesso rápido.
  const porUsuario = useMemo(() => {
    const mapa = {}
    docs.forEach((d) => {
      mapa[d.userId] = d.paginaAtual || 0
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
