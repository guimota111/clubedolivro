import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

// ---------- Usuários ----------

export async function buscarUsuario(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function criarUsuario(userId, { nome, avatarUrl }) {
  await setDoc(doc(db, 'users', userId), {
    nome,
    avatarUrl: avatarUrl || '',
    criadoEm: serverTimestamp(),
  })
}

export async function atualizarUsuario(userId, dados) {
  await updateDoc(doc(db, 'users', userId), dados)
}

// ---------- Livro atual ----------

export async function cadastrarLivro({ titulo, autor, totalPaginas, capaUrl }) {
  // Encerra o livro ativo anterior (arquiva no histórico) antes de criar o novo.
  await encerrarLivroAtivo()

  const ref = doc(collection(db, 'livroAtual'))
  await setDoc(ref, {
    titulo,
    autor: autor || '',
    totalPaginas,
    capaUrl: capaUrl || '',
    iniciadoEm: serverTimestamp(),
    ativo: true,
  })
  return ref.id
}

// Marca o livro ativo como encerrado e o copia para o histórico com o vencedor.
export async function encerrarLivroAtivo() {
  const ativoQuery = query(
    collection(db, 'livroAtual'),
    where('ativo', '==', true)
  )
  const snaps = await getDocs(ativoQuery)
  if (snaps.empty) return

  for (const livroSnap of snaps.docs) {
    const livro = livroSnap.data()
    const livroId = livroSnap.id

    // Descobre o vencedor: maior paginaAtual no progresso desse livro.
    const progQuery = query(
      collection(db, 'progresso'),
      where('livroId', '==', livroId)
    )
    const progSnaps = await getDocs(progQuery)
    let vencedorUserId = ''
    let maiorPagina = -1
    progSnaps.forEach((p) => {
      const d = p.data()
      if (typeof d.paginaAtual === 'number' && d.paginaAtual > maiorPagina) {
        maiorPagina = d.paginaAtual
        vencedorUserId = d.userId
      }
    })

    // Arquiva no histórico.
    await setDoc(doc(db, 'historicoLivros', livroId), {
      titulo: livro.titulo || '',
      autor: livro.autor || '',
      totalPaginas: livro.totalPaginas || 0,
      capaUrl: livro.capaUrl || '',
      vencedorUserId,
      encerradoEm: serverTimestamp(),
    })

    // Desativa o livro.
    await updateDoc(doc(db, 'livroAtual', livroId), { ativo: false })
  }
}

// ---------- Progresso ----------

export async function salvarProgresso(userId, livroId, paginaAtual) {
  const id = `${userId}_${livroId}`
  await setDoc(
    doc(db, 'progresso', id),
    {
      userId,
      livroId,
      paginaAtual,
      atualizadoEm: serverTimestamp(),
    },
    { merge: true }
  )
}

// ---------- Mural ----------

export async function publicarRecado(userId, texto) {
  await addDoc(collection(db, 'mural'), {
    userId,
    texto,
    criadoEm: serverTimestamp(),
  })
}

// ---------- Histórico ----------

export async function listarHistorico() {
  const q = query(
    collection(db, 'historicoLivros'),
    orderBy('encerradoEm', 'desc')
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}
