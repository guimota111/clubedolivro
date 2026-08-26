// Cria o par de chaves VAPID da Patoteca.
//
//   node gerar-chaves.mjs
//
// Rode UMA vez. Trocar o par depois invalida todas as inscrições existentes:
// cada membro teria de ligar os avisos de novo.
//
// A chave pública é para ser publicada (vai no site e no wrangler.toml). A
// privada é a única senha de verdade desta funcionalidade — quem a tiver
// consegue mandar notificação para os celulares do clube. Ela vai para o
// worker por `wrangler secret put` e não deve entrar no git.

const par = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
)

const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey))
const emBase64Url = (bytes) =>
  Buffer.from(bytes).toString('base64url')

console.log('\nChave PÚBLICA (pode publicar):')
console.log(emBase64Url(publica))
console.log('\nChave PRIVADA (guarde em segredo):')
console.log((await crypto.subtle.exportKey('jwk', par.privateKey)).d)
console.log('')
