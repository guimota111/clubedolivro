// O carteiro da Patoteca.
//
// Um único trabalho: recebe "aconteceu isto", lê as inscrições no Firestore e
// entrega o aviso em cada celular — menos no de quem escreveu, que já sabe.
//
// Ele existe por um motivo só: a chave privada VAPID precisa morar em algum
// lugar que não seja o navegador dos membros. Fora isso, ele não guarda nada e
// não sabe nada sobre livros.

import { entregar } from './webpush.js'

// Limites de sanidade. O endereço deste worker está no bundle do site, então
// qualquer um pode chamá-lo; nada aqui é sigiloso, mas também não vale servir
// de alto-falante para textos enormes.
const TAMANHO_MAXIMO_DO_TEXTO = 300
const MAXIMO_DE_INSCRICOES = 300

function resposta(dados, status, origem) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origem,
      'Access-Control-Allow-Headers': 'Content-Type, X-Patoteca-Token',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  })
}

// ---------- Firestore pela API REST ----------
//
// As regras do Firestore deixam `inscricoesPush` ser lida por qualquer um (o
// site inteiro é assim), então basta a chave pública do projeto — o worker não
// precisa de conta de serviço. Uma inscrição vazada não entrega nada a
// ninguém: sem a chave privada VAPID, o serviço de push recusa o envio.

function documentos(env) {
  return `https://firestore.googleapis.com/v1/projects/${env.PROJETO_FIREBASE}/databases/(default)/documents`
}

async function lerInscricoes(env) {
  const url = `${documentos(env)}/inscricoesPush?pageSize=${MAXIMO_DE_INSCRICOES}&key=${env.CHAVE_FIREBASE}`
  const resposta = await fetch(url)
  if (!resposta.ok) {
    throw new Error(`Firestore respondeu ${resposta.status} ao listar inscrições`)
  }
  const { documents = [] } = await resposta.json()

  return documents
    .map((documento) => ({
      caminho: documento.name,
      userId: documento.fields?.userId?.stringValue || '',
      endpoint: documento.fields?.endpoint?.stringValue || '',
      p256dh: documento.fields?.p256dh?.stringValue || '',
      auth: documento.fields?.auth?.stringValue || '',
    }))
    .filter((i) => i.endpoint && i.p256dh && i.auth)
}

// Uma inscrição que o serviço de push já não conhece (404/410) fica no
// Firestore atrapalhando para sempre se ninguém a tirar de lá.
async function esquecerInscricao(env, caminho) {
  await fetch(`https://firestore.googleapis.com/v1/${caminho}?key=${env.CHAVE_FIREBASE}`, {
    method: 'DELETE',
  }).catch(() => {})
}

// ---------- O worker ----------

// O mesmo site atende por mais de um endereço (`.web.app` e `.firebaseapp.com`),
// e o navegador exige que a resposta devolva EXATAMENTE a origem que pediu —
// uma lista não serve. Então conferimos e ecoamos a que veio.
function origemPermitida(request, env) {
  const permitidas = (env.ORIGEM_DO_SITE || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  if (!permitidas.length) return '*'
  const pedida = request.headers.get('Origin') || ''
  return permitidas.includes(pedida) ? pedida : permitidas[0]
}

export default {
  async fetch(request, env) {
    const origem = origemPermitida(request, env)

    if (request.method === 'OPTIONS') {
      return resposta({}, 204, origem)
    }
    if (request.method !== 'POST') {
      return resposta({ erro: 'só aceito POST' }, 405, origem)
    }
    if (env.TOKEN_DE_ENVIO && request.headers.get('X-Patoteca-Token') !== env.TOKEN_DE_ENVIO) {
      return resposta({ erro: 'token inválido' }, 403, origem)
    }

    let pedido
    try {
      pedido = await request.json()
    } catch {
      return resposta({ erro: 'corpo não é JSON' }, 400, origem)
    }

    const texto = String(pedido.texto || '').slice(0, TAMANHO_MAXIMO_DO_TEXTO)
    const eventoId = String(pedido.eventoId || '').slice(0, 120)
    const autorId = String(pedido.autorId || '')
    if (!texto) {
      return resposta({ erro: 'sem texto para avisar' }, 400, origem)
    }

    let inscricoes
    try {
      inscricoes = await lerInscricoes(env)
    } catch (err) {
      return resposta({ erro: String(err.message) }, 502, origem)
    }

    // Quem escreveu não recebe o próprio aviso.
    const destinatarios = inscricoes.filter((i) => i.userId !== autorId)
    const mensagem = JSON.stringify({ texto, eventoId })
    const vapid = {
      contato: env.CONTATO || 'mailto:patoteca@exemplo.com',
      publica: env.VAPID_PUBLICA,
      privada: env.VAPID_PRIVADA,
    }

    const resultados = await Promise.all(
      destinatarios.map(async (inscricao) => {
        try {
          const entrega = await entregar({ inscricao, mensagem, vapid })
          if (entrega.expirada) await esquecerInscricao(env, inscricao.caminho)
          return entrega
        } catch (err) {
          console.error('Falha ao entregar:', err.message)
          return { ok: false, status: 0, expirada: false }
        }
      })
    )

    return resposta(
      {
        entregues: resultados.filter((r) => r.ok).length,
        falhas: resultados.filter((r) => !r.ok && !r.expirada).length,
        esquecidas: resultados.filter((r) => r.expirada).length,
      },
      200,
      origem
    )
  },
}
