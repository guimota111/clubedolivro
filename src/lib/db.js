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
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from '../firebase'
import { normalizarCor, sortearCoresFaltantes, sortearCorLivre } from './cores'
import { normalizarSerie, ordemValida } from './series'
import { vencedorUserId } from './vencedor'
import { idDoVoto } from './eleicao'

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

// ---------- Livros do clube ----------
//
// O clube lê UM livro por vez — a não ser que os livros sejam de uma mesma
// série. Aí ele aceita vários ativos ao mesmo tempo (`ativo: true` em mais de
// um documento), porque a leitura de uma série se espalha naturalmente: um já
// está no terceiro volume, outro ainda no segundo. Cada volume tem a sua
// corrida, as suas notas e as suas resenhas, e o membro escolhe na tela em
// qual deles está.

function paginasValidas(valor) {
  const n = Math.round(Number(valor))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Campos de série, sempre gravados no mesmo formato: nome aparado e volume
// inteiro (ou null quando o livro é avulso / não numerado).
function camposDeSerie({ serie, serieOrdem }) {
  return {
    serie: normalizarSerie(serie),
    serieOrdem: ordemValida(serieOrdem),
  }
}

// Cadastra um livro para o clube ler.
//
// `juntarASerie` decide o que acontece com o que já está em leitura: com ele
// ligado, o livro novo entra AO LADO dos atuais (é outro volume da mesma
// série) e ninguém perde nada; desligado, o comportamento de sempre — os
// livros em leitura são encerrados e arquivados no histórico, e a rodada
// recomeça do zero.
export async function cadastrarLivro(
  { titulo, autor, capaUrl, totalPaginas, dataLimite, dataInicio, serie, serieOrdem },
  { juntarASerie = false } = {}
) {
  if (!juntarASerie) await encerrarLivroAtivo()

  const ref = doc(collection(db, 'livroAtual'))
  await setDoc(ref, {
    titulo,
    autor: autor || '',
    capaUrl: capaUrl || '',
    // Páginas da edição de referência, quando se sabe (o livro eleito traz
    // isso da indicação). Cada membro continua informando a edição DELE ao
    // marcar progresso; este número é só informativo.
    totalPaginas: paginasValidas(totalPaginas),
    // Prazo para terminar a leitura (string ISO 'YYYY-MM-DD') ou null.
    dataLimite: dataLimite || null,
    // Quando o ciclo começou. Em branco, vale `iniciadoEm` (agora) — é o caso
    // de todo livro cadastrado antes deste campo existir.
    dataInicio: dataInicio || null,
    ...camposDeSerie({ serie, serieOrdem }),
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

// Encerra UM livro: arquiva no histórico com o vencedor da rodada e o tira de
// leitura. É a peça que permite o clube aposentar um volume da série sem mexer
// nos outros que continuam abertos.
export async function encerrarLivro(livroId) {
  const livroSnap = await getDoc(doc(db, 'livroAtual', livroId))
  if (!livroSnap.exists()) return
  const livro = livroSnap.data()

  // Descobre o vencedor: quem foi mais longe e, no empate, quem chegou antes.
  const progQuery = query(
    collection(db, 'progresso'),
    where('livroId', '==', livroId)
  )
  const progSnaps = await getDocs(progQuery)
  const vencedor = vencedorUserId(
    progSnaps.docs.map((p) => p.data()),
    livro.totalPaginas || 0
  )

  // Arquiva no histórico. A série vai junto: é o que mantém os volumes
  // reconhecíveis como uma coisa só depois de encerrados.
  await setDoc(doc(db, 'historicoLivros', livroId), {
    titulo: livro.titulo || '',
    autor: livro.autor || '',
    capaUrl: livro.capaUrl || '',
    serie: normalizarSerie(livro.serie),
    serieOrdem: ordemValida(livro.serieOrdem),
    vencedorUserId: vencedor,
    encerradoEm: serverTimestamp(),
  })

  // Desativa o livro.
  await updateDoc(doc(db, 'livroAtual', livroId), { ativo: false })
}

// Encerra TODOS os livros em leitura (um por um, cada qual com o seu vencedor).
export async function encerrarLivroAtivo() {
  const ativoQuery = query(
    collection(db, 'livroAtual'),
    where('ativo', '==', true)
  )
  const snaps = await getDocs(ativoQuery)
  if (snaps.empty) return

  for (const livroSnap of snaps.docs) {
    await encerrarLivro(livroSnap.id)
  }
}

// Tira um livro da leitura SEM arquivá-lo: é o desfazer de um "Trocar o livro
// do clube" feito por engano. Ele some da tela, nada é apagado (progresso,
// notas e resenhas continuam gravados pelo id), e os livros que foram
// encerrados no engano podem ser reabertos no histórico.
export async function retirarLivroDaLeitura(livroId) {
  await updateDoc(doc(db, 'livroAtual', livroId), { ativo: false, naFila: false })
}

// Devolve à leitura um volume que havia sido encerrado. É o desfazer de
// `encerrarLivro`: o livro volta ao lado dos outros da série e sai do
// histórico, porque a rodada dele não acabou de verdade — encerrar um volume
// enquanto metade do clube ainda o está lendo é fácil de fazer sem querer
// (basta promover o da fila), e ficar sem volta seria cruel.
//
// Nada é reescrito: progresso, notas e resenhas nunca saíram do lugar, estão
// gravados pelo `livroId`, que não muda.
export async function reabrirLivro(livroId) {
  await updateDoc(doc(db, 'livroAtual', livroId), { ativo: true, naFila: false })
  await deleteDoc(doc(db, 'historicoLivros', livroId))
}

// ---------- Próximo livro (a fila do clube) ----------
//
// O clube lê um livro por vez, mas quem termina antes não precisa parar. O
// "próximo" mora na MESMA coleção `livroAtual`, marcado com `naFila: true` e
// `ativo: false`: já tem id, então progresso, notas e resenhas dele funcionam
// como as de qualquer livro — e no dia em que ele assume, nada se perde.

// Coloca um livro na fila. O clube segue no livro de agora.
export async function cadastrarProximoLivro({
  titulo,
  autor,
  capaUrl,
  totalPaginas,
  dataLimite,
  dataInicio,
  serie,
  serieOrdem,
}) {
  const ref = doc(collection(db, 'livroAtual'))
  await setDoc(ref, {
    titulo,
    autor: autor || '',
    capaUrl: capaUrl || '',
    totalPaginas: paginasValidas(totalPaginas),
    dataLimite: dataLimite || null,
    dataInicio: dataInicio || null,
    ...camposDeSerie({ serie, serieOrdem }),
    iniciadoEm: serverTimestamp(),
    ativo: false,
    naFila: true,
  })
  return ref.id
}

// Promove o livro da fila a livro do clube. Quem já vinha lendo mantém o
// progresso — ele está gravado por `livroId`, que não muda.
//
// `juntarASerie` distingue as duas formas de virar a página: sendo ele outro
// volume da mesma série em leitura, entra AO LADO dos atuais e nada é
// encerrado; caso contrário, é a troca de sempre — o que estava em leitura vai
// para o histórico com o vencedor da rodada.
export async function promoverProximoLivro(livroId, { juntarASerie = false } = {}) {
  if (!juntarASerie) await encerrarLivroAtivo()
  await updateDoc(doc(db, 'livroAtual', livroId), { ativo: true, naFila: false })
}

// Tira o livro da fila sem arquivá-lo: ele nunca chegou a ser do clube, então
// não entra no histórico. Nada é apagado — progresso, notas e resenhas de quem
// já tinha começado continuam gravados, só saem da tela.
export async function tirarProximoLivroDaFila(livroId) {
  await updateDoc(doc(db, 'livroAtual', livroId), { naFila: false })
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
  const ref = await addDoc(collection(db, 'notas'), {
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
  return ref.id
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
  const ref = await addDoc(collection(db, 'comentarios'), {
    userId,
    alvoTipo, // 'resenha' | 'nota'
    alvoId,
    texto,
    criadoEm: serverTimestamp(),
  })
  return ref.id
}

// ---------- Mural ----------

export async function publicarRecado(userId, texto) {
  const ref = await addDoc(collection(db, 'mural'), {
    userId,
    texto,
    criadoEm: serverTimestamp(),
  })
  return ref.id
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

// ---------- Eleição do próximo livro ----------
//
// Três coleções: `eleicoes` (uma por eleição, com situação, turno e as
// apurações), `indicacoes` (um livro indicado por documento, com quem indicou
// e o texto de defesa) e `votos` (um documento por pessoa por turno, com até
// dois ids de indicação). As regras do jogo estão em `lib/eleicao.js`; aqui só
// se grava.

// Abre uma eleição. Exige a senha da urna — conferida na tela, antes de
// chegar aqui, como todo o resto do app.
export async function abrirEleicao(userId, { nome, prazoIndicacoes, prazoVotacao }) {
  const ref = doc(collection(db, 'eleicoes'))
  await setDoc(ref, {
    nome: (nome || '').trim() || 'Eleição do próximo livro',
    status: 'aberta', // 'aberta' | 'empatada' | 'encerrada' | 'cancelada'
    turno: 1,
    finalistas: [],
    prazoIndicacoes: prazoIndicacoes || null,
    prazoVotacao: prazoVotacao || null,
    apuracoes: [],
    vencedorIndicacaoId: '',
    livroId: '',
    criadaPor: userId,
    criadoEm: serverTimestamp(),
    encerradaEm: null,
  })
  return ref.id
}

function camposDaIndicacao({ titulo, autor, capaUrl, totalPaginas, serie, serieOrdem, texto, fonteId }) {
  const paginas = Math.round(Number(totalPaginas))
  return {
    titulo,
    autor: autor || '',
    capaUrl: capaUrl || '',
    totalPaginas: Number.isFinite(paginas) && paginas > 0 ? paginas : null,
    ...camposDeSerie({ serie, serieOrdem }),
    texto: texto || '',
    // Id do livro na fonte de onde os dados vieram (Google Books), para
    // reconhecer o mesmo livro indicado duas vezes mesmo com título diferente.
    fonteId: fonteId || '',
  }
}

export async function indicarLivro(userId, eleicaoId, dados) {
  const ref = await addDoc(collection(db, 'indicacoes'), {
    eleicaoId,
    userId,
    ...camposDaIndicacao(dados),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })
  return ref.id
}

// Corrige uma indicação. Quem votou nela votou no que viu, então os votos que
// ela já recebeu são apagados — e o clube é avisado para votar de novo.
export async function atualizarIndicacao(indicacaoId, dados) {
  await updateDoc(doc(db, 'indicacoes', indicacaoId), {
    ...camposDaIndicacao(dados),
    atualizadoEm: serverTimestamp(),
  })
  await apagarVotosDaIndicacao(indicacaoId)
}

// Retira a indicação. Os votos nela vão junto — não há mais em que votar.
export async function removerIndicacao(indicacaoId) {
  await apagarVotosDaIndicacao(indicacaoId)
  await deleteDoc(doc(db, 'indicacoes', indicacaoId))
}

// Tira um id de indicação de todos os documentos de voto que o carregam. O
// id é único no clube inteiro, então não precisa filtrar por eleição.
async function apagarVotosDaIndicacao(indicacaoId) {
  const q = query(
    collection(db, 'votos'),
    where('indicacoes', 'array-contains', indicacaoId)
  )
  const snaps = await getDocs(q)
  await Promise.all(
    snaps.docs.map((d) =>
      updateDoc(d.ref, {
        indicacoes: arrayRemove(indicacaoId),
        atualizadoEm: serverTimestamp(),
      })
    )
  )
}

// Grava os votos de uma pessoa num turno: a lista inteira, sobrescrevendo a
// anterior. Mudar de ideia é chamar de novo com outra lista; abster-se é não
// chamar (ou chamar com a lista vazia).
export async function votar(userId, eleicaoId, turno, indicacaoIds) {
  await setDoc(doc(db, 'votos', idDoVoto(eleicaoId, turno, userId)), {
    eleicaoId,
    turno: turno || 1,
    userId,
    indicacoes: indicacaoIds,
    atualizadoEm: serverTimestamp(),
  })
}

// Registra a apuração de um turno na eleição. Com vencedor único, a eleição
// termina e o livro vira o do clube; com empate, a eleição fica `empatada` à
// espera de quem tem a senha decidir entre um novo turno e um desempate
// manual.
//
// `apuracao` é o resultado de `apurar()` (lib/eleicao.js). Só os totais e os
// empatados são gravados: é o que a tela de resultado mostra para sempre.
export async function registrarApuracao(eleicaoId, turno, apuracao) {
  const registro = {
    turno: turno || 1,
    totais: apuracao.totais,
    votantes: apuracao.votantes,
    empatados: apuracao.empatados.map((i) => i.id),
    em: Date.now(),
  }
  await updateDoc(doc(db, 'eleicoes', eleicaoId), {
    apuracoes: arrayUnion(registro),
    status: apuracao.vencedor ? 'encerrada' : 'empatada',
  })
  return registro
}

// Abre o próximo turno só entre os empatados. Os votos do turno anterior
// ficam gravados (são outro documento, pelo número do turno) e a prateleira
// passa a mostrar só os finalistas.
export async function abrirNovoTurno(eleicaoId, turnoAtual, finalistasIds, { prazoVotacao } = {}) {
  await updateDoc(doc(db, 'eleicoes', eleicaoId), {
    status: 'aberta',
    turno: (turnoAtual || 1) + 1,
    finalistas: finalistasIds,
    prazoVotacao: prazoVotacao || null,
  })
}

// Encerra a eleição com o livro vencedor, que entra na FILA do próximo livro
// (`naFila`): nada do que está em leitura é encerrado, porque nem todo mundo
// terminou. Quem já terminou pode começar a ler desde já, e quando o clube
// decidir virar a página, "Tornar o livro do clube" promove o eleito — o
// mesmo caminho de sempre. Devolve o id do livro criado.
export async function encerrarEleicaoComVencedor(eleicaoId, indicacao) {
  const livroId = await cadastrarProximoLivro({
    titulo: indicacao.titulo,
    autor: indicacao.autor,
    capaUrl: indicacao.capaUrl,
    totalPaginas: indicacao.totalPaginas,
    serie: indicacao.serie,
    serieOrdem: indicacao.serieOrdem,
    dataLimite: null,
    dataInicio: null,
  })
  await updateDoc(doc(db, 'eleicoes', eleicaoId), {
    status: 'encerrada',
    vencedorIndicacaoId: indicacao.id,
    livroId,
    encerradaEm: serverTimestamp(),
  })
  return livroId
}

// Cancela a eleição. Indicações e votos ficam gravados, só saem de cena.
export async function cancelarEleicao(eleicaoId) {
  await updateDoc(doc(db, 'eleicoes', eleicaoId), {
    status: 'cancelada',
    encerradaEm: serverTimestamp(),
  })
}
