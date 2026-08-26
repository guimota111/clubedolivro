// Web Push: assinar (VAPID, RFC 8292) e criptografar (aes128gcm, RFC 8291).
//
// Nada aqui é invenção nossa — são dois padrões, e todo navegador implementa a
// outra ponta. Só usamos WebCrypto, que existe tanto no Cloudflare Workers
// quanto no Node, então o mesmo arquivo roda em produção e no teste.
//
// A correção deste arquivo é verificada por `webpush.teste.mjs`, que abre o
// que ele fecha usando uma biblioteca independente (`http_ece`).

const texto = new TextEncoder()

export function deBase64Url(valor) {
  const base64 = valor.replace(/-/g, '+').replace(/_/g, '/')
  const bruto = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0))
}

export function paraBase64Url(bytes) {
  let bruto = ''
  for (const b of bytes) bruto += String.fromCharCode(b)
  return btoa(bruto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function juntar(...partes) {
  const total = partes.reduce((soma, p) => soma + p.length, 0)
  const saida = new Uint8Array(total)
  let posicao = 0
  for (const parte of partes) {
    saida.set(parte, posicao)
    posicao += parte.length
  }
  return saida
}

// HKDF (extrair + expandir) numa chamada só: é exatamente o que o RFC 8291 usa
// em cada etapa, sempre com SHA-256.
async function derivar(ikm, salt, info, tamanho) {
  const base = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    base,
    tamanho * 8
  )
  return new Uint8Array(bits)
}

// ---------- VAPID: provar que o envio partiu de quem o membro autorizou ----------

// O par de chaves guardado como base64url vira o formato que o WebCrypto quer.
// A pública são 65 bytes: 0x04, depois X e Y de 32 bytes cada.
function chaveJwk(publicaBase64Url, privadaBase64Url) {
  const publica = deBase64Url(publicaBase64Url)
  return {
    kty: 'EC',
    crv: 'P-256',
    x: paraBase64Url(publica.slice(1, 33)),
    y: paraBase64Url(publica.slice(33, 65)),
    d: privadaBase64Url,
    ext: true,
  }
}

// O cabeçalho `Authorization` que acompanha cada entrega. `aud` é a ORIGEM do
// serviço de push (https://web.push.apple.com, por exemplo) — um token vale
// para todas as inscrições daquele serviço, não para uma só.
export async function autorizacaoVapid({ audiencia, contato, publica, privada }) {
  const cabecalho = { typ: 'JWT', alg: 'ES256' }
  const corpo = {
    aud: audiencia,
    // 12 horas: o RFC 8292 não deixa passar de 24.
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: contato,
  }
  const inicio = `${paraBase64Url(texto.encode(JSON.stringify(cabecalho)))}.${paraBase64Url(
    texto.encode(JSON.stringify(corpo))
  )}`

  const chave = await crypto.subtle.importKey(
    'jwk',
    chaveJwk(publica, privada),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const assinatura = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    chave,
    texto.encode(inicio)
  )

  const jwt = `${inicio}.${paraBase64Url(new Uint8Array(assinatura))}`
  return `vapid t=${jwt}, k=${publica}`
}

// ---------- Criptografia: só o celular do membro consegue ler ----------

// Devolve o corpo pronto do POST. O formato é:
//
//   salt (16) | tamanho do registro (4) | tamanho da chave (1) | chave (65) | cifrado
//
// A chave efêmera vai junto porque o celular precisa dela para refazer o
// segredo compartilhado — o que ele não tem, e ninguém no meio do caminho tem,
// é a outra metade.
export async function criptografar(mensagem, p256dhBase64Url, authBase64Url) {
  const publicaDoAparelho = deBase64Url(p256dhBase64Url) // 65 bytes
  const segredoDeAutenticacao = deBase64Url(authBase64Url) // 16 bytes

  // Um par novo a cada mensagem: é o que torna cada envio único.
  const efemero = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )
  const nossaPublica = new Uint8Array(
    await crypto.subtle.exportKey('raw', efemero.publicKey)
  )
  const chaveDoAparelho = await crypto.subtle.importKey(
    'raw',
    publicaDoAparelho,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  const segredoCompartilhado = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: chaveDoAparelho },
      efemero.privateKey,
      256
    )
  )

  // Primeira derivação: mistura o segredo ECDH com o segredo de autenticação
  // da inscrição, amarrando as duas chaves públicas envolvidas.
  const infoDaChave = juntar(
    texto.encode('WebPush: info'),
    Uint8Array.of(0),
    publicaDoAparelho,
    nossaPublica
  )
  const ikm = await derivar(segredoCompartilhado, segredoDeAutenticacao, infoDaChave, 32)

  // Segunda derivação: a chave AES e o nonce propriamente ditos.
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const chaveAes = await derivar(
    ikm,
    salt,
    juntar(texto.encode('Content-Encoding: aes128gcm'), Uint8Array.of(0)),
    16
  )
  const nonce = await derivar(
    ikm,
    salt,
    juntar(texto.encode('Content-Encoding: nonce'), Uint8Array.of(0)),
    12
  )

  // O 0x02 no fim marca "este é o último registro" (é o padding delimiter).
  const claro = juntar(texto.encode(mensagem), Uint8Array.of(2))
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      await crypto.subtle.importKey('raw', chaveAes, 'AES-GCM', false, ['encrypt']),
      claro
    )
  )

  // Tamanho do registro: 4096 bytes, em big-endian. Nossos avisos são frases
  // curtas, então tudo cabe num registro só.
  const tamanhoDoRegistro = Uint8Array.of(0x00, 0x00, 0x10, 0x00)
  return juntar(
    salt,
    tamanhoDoRegistro,
    Uint8Array.of(nossaPublica.length),
    nossaPublica,
    cifrado
  )
}

// ---------- A entrega ----------

// `endpoint` é a caixa postal do aparelho. A resposta 201 quer dizer que o
// serviço de push aceitou; 404 e 410 querem dizer que aquela inscrição morreu
// (o membro desinstalou o app, limpou o navegador) e deve ser esquecida.
export async function entregar({ inscricao, mensagem, vapid }) {
  const corpo = await criptografar(mensagem, inscricao.p256dh, inscricao.auth)
  const autorizacao = await autorizacaoVapid({
    audiencia: new URL(inscricao.endpoint).origin,
    ...vapid,
  })

  const resposta = await fetch(inscricao.endpoint, {
    method: 'POST',
    headers: {
      Authorization: autorizacao,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      // Quanto tempo o serviço guarda o aviso se o celular estiver desligado.
      TTL: '86400',
      Urgency: 'normal',
    },
    body: corpo,
  })

  return {
    ok: resposta.ok,
    status: resposta.status,
    expirada: resposta.status === 404 || resposta.status === 410,
  }
}
