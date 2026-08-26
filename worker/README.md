# Avisos da Patoteca — o carteiro

Este worker existe por um motivo só: a **chave privada VAPID** precisa morar em
algum lugar que não seja o celular dos membros. Ele recebe "aconteceu isto",
lê as inscrições no Firestore e entrega o aviso em cada aparelho.

É grátis (o plano gratuito da Cloudflare dá 100 mil execuções por dia; a
Patoteca inteira usa algumas dezenas) e, depois de publicado, você não mexe
mais nele.

## Publicar, uma vez

Tudo isto é feito **uma vez só**. São cinco passos.

### 1. Gerar o par de chaves

```bash
cd worker
node gerar-chaves.mjs
```

Ele imprime duas chaves. Deixe o terminal aberto, você vai usar as duas agora.

> Guarde a privada num lugar seguro (o gerenciador de senhas serve). Gerar um
> par novo depois desliga os avisos de todo mundo: cada membro teria de ligar
> outra vez.

### 2. Colar a chave pública em dois lugares

- `worker/wrangler.toml` → `VAPID_PUBLICA = "..."`
- `src/lib/push.js` → `const CHAVE_VAPID = '...'`

Têm de ser idênticas. Se divergirem, o navegador cria a inscrição com uma
chave e o worker assina com outra — o serviço de push recusa a entrega, sem
erro visível em lugar nenhum.

### 3. Publicar o worker

```bash
cd worker
npm install
npx wrangler login     # abre o navegador; crie a conta grátis se ainda não tiver
npx wrangler deploy
```

No fim ele imprime o endereço, algo como
`https://patoteca-avisos.SEU-USUARIO.workers.dev`.

### 4. Guardar os segredos

```bash
npx wrangler secret put VAPID_PRIVADA    # cole a chave privada do passo 1
npx wrangler secret put TOKEN_DE_ENVIO   # invente uma frase qualquer
```

Segredos não ficam no `wrangler.toml` nem no git — a Cloudflare os guarda e o
worker os lê na hora de rodar.

Sobre o `TOKEN_DE_ENVIO`: ele **também vai no site** (`src/lib/push.js`), então
qualquer um que leia o JavaScript da Patoteca o encontra. Ele não é uma senha —
serve para o worker ignorar quem simplesmente esbarrou na URL. Quem quiser
mesmo mandar um aviso falso para o clube consegue. É o mesmo nível de proteção
que o resto do app já tem (o Firestore é aberto), e para um clube de amigos com
o link não divulgado isso é aceitável — mas é bom saber, e não confundir com
segurança de verdade.

### 5. Apontar o site para o worker

Em `src/lib/push.js`:

```js
const CHAVE_VAPID = 'a chave pública do passo 1'
const ENVIO = 'https://patoteca-avisos.SEU-USUARIO.workers.dev'
const TOKEN = 'a mesma frase do passo 4'
```

Publique o site (`git push` na branch de deploy, ou a aba Actions no GitHub) e
pronto: o botão "Receber avisos no celular" aparece no perfil de cada membro.

Enquanto esses três valores estiverem vazios, o app funciona normalmente — o
perfil só mostra que os avisos ainda não foram configurados, em vez de oferecer
um botão que não faria nada.

## Conferir que está de pé

```bash
curl -X POST https://patoteca-avisos.SEU-USUARIO.workers.dev \
  -H 'Content-Type: application/json' \
  -H 'X-Patoteca-Token: a-sua-frase' \
  -d '{"texto":"teste da Patoteca","eventoId":"","autorId":""}'
```

Responde `{"entregues":N,"falhas":0,"esquecidas":0}` — e o aviso chega nos
celulares que já ligaram os avisos. Com `"autorId":""` ninguém é pulado, então
o seu próprio aparelho também recebe.

Para ver o que ele anda fazendo: `npx wrangler tail`.

## Os arquivos

| Arquivo | O que é |
|---|---|
| `index.js` | o worker: recebe, lê as inscrições, entrega, limpa as mortas |
| `webpush.js` | assinatura VAPID (RFC 8292) e criptografia aes128gcm (RFC 8291) |
| `webpush.teste.mjs` | prova que a criptografia está certa, abrindo-a com outra biblioteca |
| `gerar-chaves.mjs` | cria o par VAPID |
| `wrangler.toml` | configuração pública (id do projeto, chave pública, origens) |

Mexeu em `webpush.js`? Rode o teste antes de publicar:

```bash
cd worker && npm test
```

Ele finge ser um celular inscrito, pede ao nosso código para criptografar uma
frase e então a **abre com o `http_ece`**, biblioteca de terceiros. Se a frase
volta inteira, o nosso lado está certo. Vale a pena: criptografia errada não dá
erro — a notificação simplesmente não chega, e não há log para investigar.
