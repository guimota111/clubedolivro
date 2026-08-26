// Confere se `webpush.js` criptografa mesmo do jeito que os celulares esperam.
//
//   cd worker && npm install && node webpush.teste.mjs
//
// A ideia: fingir ser um aparelho inscrito (par de chaves + segredo de
// autenticação), pedir ao nosso código para criptografar uma frase, e então
// ABRIR o resultado com o `http_ece` — uma biblioteca de terceiros, escrita
// por outra gente, a mesma que o `web-push` usa. Se a frase volta inteira, o
// nosso lado está certo: não é o nosso código conferindo a si mesmo.
//
// Vale a pena ter isto: criptografia errada não dá erro, só silêncio. A
// notificação simplesmente não chega, e não há log nenhum para investigar.

import crypto from 'node:crypto'
import assert from 'node:assert'
import ece from 'http_ece'
import { criptografar, autorizacaoVapid, deBase64Url, paraBase64Url } from './webpush.js'

const b64 = (buffer) => buffer.toString('base64url')

// ---------- Um aparelho de mentira ----------

const aparelho = crypto.createECDH('prime256v1')
aparelho.generateKeys()
const segredoDeAutenticacao = crypto.randomBytes(16)

const FRASE = 'Monique se surpreendeu na página 200 de Duna.'

// ---------- Ida: o nosso código fecha ----------

const corpo = await criptografar(
  FRASE,
  b64(aparelho.getPublicKey()),
  b64(segredoDeAutenticacao)
)

// ---------- Volta: a biblioteca independente abre ----------

const aberto = ece.decrypt(Buffer.from(corpo), {
  version: 'aes128gcm',
  privateKey: aparelho,
  authSecret: b64(segredoDeAutenticacao),
})

assert.strictEqual(aberto.toString('utf8'), FRASE)
console.log('✓ criptografia aes128gcm — o aparelho leu a frase de volta')

// ---------- O cabeçalho de assinatura ----------

// Gera um par VAPID de verdade e confere que o JWT sai no formato certo e com
// assinatura que fecha com a chave pública.
const par = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
)
const publica = paraBase64Url(
  new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey))
)
const privada = (await crypto.subtle.exportKey('jwk', par.privateKey)).d

const autorizacao = await autorizacaoVapid({
  audiencia: 'https://web.push.apple.com',
  contato: 'mailto:patoteca@exemplo.com',
  publica,
  privada,
})

assert.match(autorizacao, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/)

const [, jwt] = autorizacao.match(/^vapid t=([^,]+)/)
const [cabecalho, dados, assinatura] = jwt.split('.')
const corpoJwt = JSON.parse(Buffer.from(dados, 'base64url'))
assert.strictEqual(corpoJwt.aud, 'https://web.push.apple.com')
assert.strictEqual(corpoJwt.sub, 'mailto:patoteca@exemplo.com')
assert.ok(corpoJwt.exp > Math.floor(Date.now() / 1000))
assert.ok(corpoJwt.exp <= Math.floor(Date.now() / 1000) + 24 * 60 * 60)
assert.strictEqual(JSON.parse(Buffer.from(cabecalho, 'base64url')).alg, 'ES256')

const assinaturaConfere = await crypto.subtle.verify(
  { name: 'ECDSA', hash: 'SHA-256' },
  par.publicKey,
  deBase64Url(assinatura),
  new TextEncoder().encode(`${cabecalho}.${dados}`)
)
assert.ok(assinaturaConfere, 'a assinatura do JWT não fecha com a chave pública')
console.log('✓ assinatura VAPID — JWT ES256 válido e dentro do prazo')

console.log('\nTudo certo.')
