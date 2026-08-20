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

// Assina a coleção de livros do clube inteira — ela tem um documento por livro
// que o clube já leu, então é pequena — e separa os três papéis que um livro
// pode ter: em leitura (`ativo`), na fila para ser o próximo (`naFila`) ou já
// encerrado.
//
// Vale uma assinatura só porque os encerrados também aparecem na tela: um
// volume que o clube terminou continua no trilho da série, marcado como tal —
// sumir dali seria perder de vista metade da leitura.
export function useLivrosDoClube() {
  const { docs, carregando } = useColecaoAoVivo(
    () => collection(db, 'livroAtual'),
    []
  )

  // Em leitura, na ordem dos volumes — do primeiro ao último, que é como o
  // leitor os procura na tela.
  const abertos = useMemo(
    () => ordenarSerie(docs.filter((l) => l.ativo === true)),
    [docs]
  )

  const encerrados = useMemo(
    () => docs.filter((l) => l.ativo !== true && l.naFila !== true),
    [docs]
  )

  // Se houver mais de um na fila por acaso, vale o mais recente.
  const proximo = useMemo(() => {
    const naFila = docs.filter((l) => l.naFila === true)
    if (!naFila.length) return null
    return naFila.sort(
      (a, b) => (b.iniciadoEm?.seconds || 0) - (a.iniciadoEm?.seconds || 0)
    )[0]
  }, [docs])

  return { livros: docs, abertos, encerrados, proximo, carregando }
}

// Assina o progresso do clube inteiro: um documento por membro por livro. São
// poucos (um clube de amigos, alguns livros) e ter todos à mão é o que permite
// desenhar a corrida de cada volume, a régua do seletor, a estante pessoal e —
// no histórico — dizer quem venceu cada rodada sem depender do que ficou
// gravado lá atrás.
export function useProgresso() {
  const { docs, carregando } = useColecaoAoVivo(
    () => collection(db, 'progresso'),
    []
  )
  // livroId -> (userId -> documento completo)
  const porLivro = useMemo(() => {
    const mapa = {}
    docs.forEach((d) => {
      ;(mapa[d.livroId] = mapa[d.livroId] || {})[d.userId] = d
    })
    return mapa
  }, [docs])
  // userId -> (livroId -> documento completo)
  const porMembro = useMemo(() => {
    const mapa = {}
    docs.forEach((d) => {
      ;(mapa[d.userId] = mapa[d.userId] || {})[d.livroId] = d
    })
    return mapa
  }, [docs])
  return { progresso: docs, porLivro, porMembro, carregando }
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
