import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { normalizarCor, sortearCoresFaltantes, sortearCorLivre } from './cores'

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

export async function criarUsuario(userId, { nome, avatarUrl, cor }) {
  await setDoc(doc(db, 'users', userId), {
    nome,
    avatarUrl: avatarUrl || '',
    // Cor da barra de progresso. Se o membro não escolher, sorteamos uma.
    cor: normalizarCor(cor) || sortearCorLivre([], userId),
    criadoEm: serverTimestamp(),
  })
}

export async function atualizarUsuario(userId, dados) {
  await updateDoc(doc(db, 'users', userId), dados)
}

// Dá uma cor aos membros que entraram antes desta funcionalidade existir.
// O sorteio é determinístico (ver `sortearCoresFaltantes`), então dois
// navegadores rodando isto ao mesmo tempo gravam exatamente a mesma cor.
export async function garantirCoresDosMembros(membros) {
  const faltantes = sortearCoresFaltantes(membros)
  if (!faltantes.length) return 0
  await Promise.all(
    faltantes.map(({ id, cor }) =>
      updateDoc(doc(db, 'users', id), { cor }).catch((err) => {
        console.error('Não foi possível sortear a cor de', id, err)
      })
    )
  )
  return faltantes.length
}

// ---------- Livro atual ----------

export async function cadastrarLivro({ titulo, autor, capaUrl, dataLimite, dataInicio }) {
  // Encerra o livro ativo anterior (arquiva no histórico) antes de criar o novo.
  await encerrarLivroAtivo()

  const ref = doc(collection(db, 'livroAtual'))
  await setDoc(ref, {
    titulo,
    autor: autor || '',
    capaUrl: capaUrl || '',
    // Prazo para terminar a leitura (string ISO 'YYYY-MM-DD') ou null.
    dataLimite: dataLimite || null,
    // Quando o ciclo começou. Em branco, vale `iniciadoEm` (agora) — é o caso
    // de todo livro cadastrado antes deste campo existir.
    dataInicio: dataInicio || null,
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

// ---------- Resenhas (liberadas para quem terminou o livro) ----------

// Uma resenha por membro por livro (id composto). Pode ser reeditada.
export async function salvarResenha(userId, livroId, { texto, nota }) {
  const id = `${userId}_${livroId}`
  await setDoc(
    doc(db, 'resenhas', id),
    {
      userId,
      livroId,
      texto,
      nota: nota || 0, // 0 = sem nota; 1..5 = estrelas
      atualizadoEm: serverTimestamp(),
    },
    { merge: true }
  )
}

// ---------- Notas parciais (com desbloqueio por página/porcentagem) ----------

// Cada nota guarda o limite de desbloqueio SEMPRE convertido em % (para
// comparar entre edições diferentes), além do valor/tipo original só para
// exibição. Outros membros só leem quando o próprio progresso alcança o limite.
export async function salvarNota(
  userId,
  livroId,
  { texto, emoji, desbloqueioPct, desbloqueioTipo, desbloqueioValor, totalPaginas }
) {
  await addDoc(collection(db, 'notas'), {
    userId,
    livroId,
    texto,
    // Reação visível para TODOS (mesmo quem ainda não desbloqueou o texto).
    emoji: emoji || '💬',
    desbloqueioPct,
    desbloqueioTipo, // 'pagina' | 'porcentagem'
    desbloqueioValor,
    totalPaginas: totalPaginas || null,
    criadoEm: serverTimestamp(),
  })
}

// Edita uma nota existente (apenas o autor, validado no cliente + regras).
export async function atualizarNota(notaId, dados) {
  await updateDoc(doc(db, 'notas', notaId), {
    ...dados,
    atualizadoEm: serverTimestamp(),
  })
}

// Exclui uma nota e, junto, os comentários que apontavam para ela (sem órfãos).
export async function excluirNota(notaId) {
  const q = query(collection(db, 'comentarios'), where('alvoId', '==', notaId))
  const snaps = await getDocs(q)
  await Promise.all(snaps.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'notas', notaId))
}

// ---------- Comentários (em resenhas e notas parciais) ----------

// Um comentário aponta para um "alvo" (uma resenha ou uma nota) pelo id.
export async function publicarComentario(userId, { alvoTipo, alvoId, texto }) {
  await addDoc(collection(db, 'comentarios'), {
    userId,
    alvoTipo, // 'resenha' | 'nota'
    alvoId,
    texto,
    criadoEm: serverTimestamp(),
  })
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
