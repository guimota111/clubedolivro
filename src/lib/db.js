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

// Lista todos os membros já cadastrados (para entrar em outro dispositivo).
export async function listarUsuarios() {
  const snaps = await getDocs(collection(db, 'users'))
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
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

export async function cadastrarLivro({ titulo, autor, capaUrl }) {
  // Encerra o livro ativo anterior (arquiva no histórico) antes de criar o novo.
  await encerrarLivroAtivo()

  const ref = doc(collection(db, 'livroAtual'))
  await setDoc(ref, {
    titulo,
    autor: autor || '',
    capaUrl: capaUrl || '',
    iniciadoEm: serverTimestamp(),
    ativo: true,
  })
  return ref.id
}

// Edita os dados do livro atual SEM encerrá-lo nem zerar o progresso.
// Útil para corrigir título, autor ou capa.
export async function atualizarLivro(livroId, dados) {
  await updateDoc(doc(db, 'livroAtual', livroId), dados)
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

    // Descobre o vencedor: maior porcentagem no progresso desse livro
    // (com fallback para paginaAtual/totalPaginas do modelo antigo).
    const progQuery = query(
      collection(db, 'progresso'),
      where('livroId', '==', livroId)
    )
    const progSnaps = await getDocs(progQuery)
    let vencedorUserId = ''
    let maiorPct = -1
    progSnaps.forEach((p) => {
      const d = p.data()
      let pct = null
      if (typeof d.porcentagem === 'number') {
        pct = d.porcentagem
      } else if (typeof d.paginaAtual === 'number' && livro.totalPaginas > 0) {
        pct = (d.paginaAtual / livro.totalPaginas) * 100
      }
      if (pct != null && pct > maiorPct) {
        maiorPct = pct
        vencedorUserId = d.userId
      }
    })

    // Arquiva no histórico.
    await setDoc(doc(db, 'historicoLivros', livroId), {
      titulo: livro.titulo || '',
      autor: livro.autor || '',
      capaUrl: livro.capaUrl || '',
      vencedorUserId,
      encerradoEm: serverTimestamp(),
    })

    // Desativa o livro.
    await updateDoc(doc(db, 'livroAtual', livroId), { ativo: false })
  }
}

// ---------- Progresso ----------

// Salva o progresso do membro. `dados` sempre traz `porcentagem` (0-100), que
// é a fonte de verdade usada nas barras/ranking. Quando o membro informa por
// página, também guardamos `paginaAtual`, `totalPaginas` (da edição DELE) e
// `modo`, para reabrir o modal já no jeito que ele usou — cada edição
// (Kindle, físico…) tem uma contagem diferente, por isso a página é sempre
// convertida em % antes de comparar.
export async function salvarProgresso(userId, livroId, dados) {
  const id = `${userId}_${livroId}`
  await setDoc(
    doc(db, 'progresso', id),
    {
      userId,
      livroId,
      ...dados,
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
