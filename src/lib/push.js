// Avisos no celular (Web Push).
//
// O caminho de um aviso, do começo ao fim:
//
//   1. O membro liga os avisos no perfil. O navegador dele cria uma INSCRIÇÃO:
//      uma URL secreta na Apple (iPhone) ou no Google (Android), que é a caixa
//      postal daquele aparelho. Ela fica guardada em `inscricoesPush`.
//   2. Alguém escreve uma nota. O navegador de quem escreveu chama `anunciar`,
//      que bate no worker (`worker/index.js`).
//   3. O worker lê as inscrições, criptografa o texto para cada aparelho,
//      assina com a chave VAPID e entrega nas caixas postais.
//   4. O `public/sw.js` do aparelho acorda, mostra a notificação e, no toque,
//      abre o app no lugar certo.
//
// A parte secreta (a chave privada VAPID) mora só no worker. Aqui só existe a
// chave PÚBLICA, que é feita para ser publicada.

import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

// ---------- Configuração ----------
//
// Estes dois valores saem do deploy do worker (veja `worker/README.md`). Sem
// eles preenchidos o app funciona igual — só sem avisos, e o perfil explica
// isso em vez de oferecer um botão que não faz nada.

// Chave pública do par VAPID, gerada por `node worker/gerar-chaves.mjs`.
const CHAVE_VAPID = 'BOZKW-IGYa7WMH2fta3Fgl5_JU0G-sVsktXcTPgGsQErC60eFAF_5jhbSJAV9vR-_yAudRybkpXbNOSybvZOR68'
// Endereço do worker publicado, ex.: 'https://patoteca-avisos.SEU-USUARIO.workers.dev'
const ENVIO = ''
// Mesmo valor do secret `TOKEN_DE_ENVIO` do worker. Ele viaja no bundle do
// site, então não é senha: serve para o worker ignorar o tráfego de quem
// simplesmente achou a URL, não para impedir quem lê este arquivo.
const TOKEN = ''

// ---------- Quem está escrevendo ----------
//
// O texto do aviso é montado em vários cantos do app ("Fulano comentou…"), e
// nem todos eles recebem o perfil por props. Em vez de enfiar o nome em sete
// componentes, o App deposita a identidade aqui uma vez.

let autor = { userId: '', nome: 'Alguém' }

export function definirAutor(userId, nome) {
  autor = { userId, nome: nome || 'Alguém' }
}

export function meuNome() {
  return autor.nome
}

// ---------- O que este aparelho consegue fazer ----------

export function pushConfigurado() {
  return !!(CHAVE_VAPID && ENVIO)
}

function ehIphone() {
  return /iP(hone|ad|od)/.test(navigator.userAgent)
}

// Instalado na tela de início, o site roda como app — e é a única forma de o
// iOS entregar Web Push. No Safari comum nem existe `PushManager`.
function instaladoNaTelaDeInicio() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    navigator.standalone === true
  )
}

// Um estado só, para a tela não ter de adivinhar o que dizer:
//
//   'desligado'   — dá para ligar agora
//   'ligado'      — este aparelho já recebe
//   'bloqueado'   — o membro negou a permissão; só nos ajustes do navegador
//   'instalar'    — iPhone que ainda não adicionou o site à tela de início
//   'indisponivel'— navegador sem suporte
//   'sem-configuracao' — o worker ainda não foi publicado
export async function estadoDosAvisos() {
  if (!pushConfigurado()) return 'sem-configuracao'
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return ehIphone() && !instaladoNaTelaDeInicio() ? 'instalar' : 'indisponivel'
  }
  if (!('PushManager' in window)) {
    return ehIphone() && !instaladoNaTelaDeInicio() ? 'instalar' : 'indisponivel'
  }
  if (Notification.permission === 'denied') return 'bloqueado'

  try {
    const registro = await registroPronto()
    const inscricao = await registro.pushManager.getSubscription()
    return inscricao ? 'ligado' : 'desligado'
  } catch {
    return 'indisponivel'
  }
}

// ---------- Registrar o service worker ----------

// `navigator.serviceWorker.ready` nunca resolve se o registro falhar — e um
// botão girando para sempre é pior do que uma explicação. Depois de dez
// segundos desistimos e tratamos como "este navegador não dá".
const ESPERA_MAXIMA = 10000

function registroPronto() {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, rejeitar) =>
      setTimeout(() => rejeitar(new Error('service worker não ficou pronto')), ESPERA_MAXIMA)
    ),
  ])
}

export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch (err) {
    console.error('Não foi possível registrar o service worker:', err)
    return null
  }
}

// ---------- Ligar e desligar ----------

// A chave VAPID viaja em base64url; o navegador quer os bytes crus.
function bytesDaChave(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const completo = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const bruto = atob(completo)
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0))
}

// O id do documento é o resumo do endereço da caixa postal: o mesmo aparelho
// reinscrevendo sobrescreve o próprio registro em vez de criar um segundo.
async function idDaInscricao(endpoint) {
  const resumo = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(endpoint)
  )
  return Array.from(new Uint8Array(resumo))
    .slice(0, 20)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function ligarAvisos(userId) {
  // A permissão só pode ser pedida a partir de um toque do membro — por isso
  // esta função nasce sempre de um clique, nunca de um `useEffect`.
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return 'bloqueado'

  const registro = await registroPronto()
  const inscricao =
    (await registro.pushManager.getSubscription()) ||
    (await registro.pushManager.subscribe({
      // Obrigatório: promete que todo push vira notificação visível.
      userVisibleOnly: true,
      applicationServerKey: bytesDaChave(CHAVE_VAPID),
    }))

  const { endpoint, keys } = inscricao.toJSON()
  await setDoc(doc(db, 'inscricoesPush', await idDaInscricao(endpoint)), {
    userId,
    endpoint,
    // Chaves públicas do aparelho: é com elas que o worker criptografa o texto
    // de modo que só este celular consiga abrir.
    p256dh: keys.p256dh,
    auth: keys.auth,
    criadoEm: serverTimestamp(),
  })
  return 'ligado'
}

export async function desligarAvisos() {
  const registro = await registroPronto()
  const inscricao = await registro.pushManager.getSubscription()
  if (!inscricao) return 'desligado'

  const { endpoint } = inscricao.toJSON()
  await inscricao.unsubscribe()
  try {
    await deleteDoc(doc(db, 'inscricoesPush', await idDaInscricao(endpoint)))
  } catch (err) {
    // A caixa postal já foi cancelada no navegador; um registro órfão no
    // Firestore só rende uma entrega falha, que o worker limpa sozinho.
    console.error('Não foi possível apagar a inscrição:', err)
  }
  return 'desligado'
}

// ---------- Avisar o clube ----------

// Chamada logo depois de gravar algo. NUNCA lança: um aviso que não sai não
// pode derrubar a nota que o membro acabou de escrever.
//
// `eventoId` é o mesmo id que `montarAtividades` dá ao evento (ex.:
// `nota-a1b2c3`) — é o que faz o toque na notificação cair no lugar certo.
export function anunciar(eventoId, texto) {
  if (!pushConfigurado() || !texto) return
  try {
    fetch(ENVIO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Patoteca-Token': TOKEN },
      // O aviso costuma sair no mesmo instante em que o membro fecha o app;
      // `keepalive` deixa o pedido terminar mesmo assim.
      keepalive: true,
      body: JSON.stringify({ autorId: autor.userId, eventoId, texto }),
    }).catch((err) => console.error('Não foi possível avisar o clube:', err))
  } catch (err) {
    console.error('Não foi possível avisar o clube:', err)
  }
}
