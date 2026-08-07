# 📖 Clube do Livro

Site para um clube do livro entre amigos, onde todos leem o mesmo livro ao mesmo
tempo e competem visualmente para ver quem avança mais rápido — sem login/senha.
Tudo gira em torno de uma **estante viva** que mostra o progresso de cada membro em
tempo real.

Estética: biblioteca clássica/vintage — madeira escura, couro, papel envelhecido,
tipografia serifada e dourado como cor de destaque.

## Stack

- **Frontend:** React + Vite
- **Dados:** Firebase Firestore (tempo real via `onSnapshot`)
- **Imagens:** Firebase Storage (avatares e capas)
- **Hospedagem:** Firebase Hosting
- **Sem Firebase Authentication** — a identidade é um UUID salvo no `localStorage`
  do navegador, associado a um documento em `users/{userId}`.

## Funcionalidades

- **Cadastro sem senha:** nome/apelido + foto (vira o avatar do membro) + a cor
  do leitor.
- **Cor de cada leitor:** cada membro escolhe sua cor (paleta do clube ou um tom
  livre) no cadastro e em "Editar perfil". Ela pinta a barra de progresso na
  pista e na estante e emoldura o retrato. Quem entrou antes desta
  funcionalidade recebe uma cor sorteada automaticamente.
- **Dourado = últimas 24 h:** a barra é pintada na cor do leitor, mas o trecho
  que ele avançou nas últimas 24 horas fica **dourado** — dá para ver de
  relance quem devorou o livro de ontem para hoje.
- **A Estante:** cada membro é um "livro-termômetro" que se enche de baixo para
  cima conforme a % de páginas lidas. Reordena ao vivo, do mais avançado ao
  menos avançado, com destaque (coroa + brilho) para o 1º lugar.
- **Livro do clube:** qualquer membro cadastra o livro atual (título, autor,
  total de páginas, capa por upload ou URL). Ao trocar de livro, o anterior é
  arquivado no histórico com o vencedor e o progresso de todos zera.
- **Atualizar progresso:** o membro informa apenas a página atual; a % é
  calculada. Botão flutuante fixo, acessível no celular.
- **Mural de recados:** post-its que qualquer membro pode deixar.
- **Histórico:** livros já lidos e quem venceu cada rodada.

## Rodando localmente

```bash
npm install
npm run dev
```

O app abre em `http://localhost:5173`. As credenciais do Firebase já estão em
`src/firebase.js` (projeto `clube-do-livro-16073`).

## Build

```bash
npm run build     # gera a pasta dist/
npm run preview   # pré-visualiza o build
```

## Deploy (Firebase Hosting)

### Automático (GitHub Actions)

O workflow `.github/workflows/publicar.yml` publica **o site e as regras** a
cada mudança na branch principal. Também dá para rodar na mão pelo navegador,
sem terminal: aba **Actions** → **Publicar no Firebase** → **Run workflow**.

Site e regras vão juntos de propósito — assim nunca fica uma regra nova no ar
sem o código que a usa (ou o contrário).

**Configuração, uma vez só.** O workflow precisa de um secret chamado
`FIREBASE_SERVICE_ACCOUNT`:

1. No [Console do Google Cloud](https://console.cloud.google.com/iam-admin/serviceaccounts),
   com o projeto `clube-do-livro-16073` selecionado, crie uma conta de serviço
   (ex.: `deploy-github`) com o papel **Firebase Admin**.
2. Na conta criada, aba **Chaves** → **Adicionar chave** → **Criar nova chave**
   → tipo **JSON**. Um arquivo é baixado.
3. No GitHub, em **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**, crie `FIREBASE_SERVICE_ACCOUNT` e cole o
   **conteúdo inteiro** do arquivo JSON.

O papel *Firebase Admin* cobre Hosting e regras sem dar acesso ao resto do
Google Cloud. A chave é um segredo de verdade: não a coloque em nenhum commit —
os secrets do GitHub não são expostos em PRs vindos de forks, e este workflow só
roda na branch principal ou quando alguém com acesso de escrita o dispara.

### Manual (Firebase CLI)

Requer a [Firebase CLI](https://firebase.google.com/docs/cli) instalada e
autenticada (`firebase login`).

```bash
# 1. Publicar as regras de segurança (Firestore + Storage)
firebase deploy --only firestore:rules,storage

# 2. Publicar o site
npm run build
firebase deploy --only hosting
```

O `firebase.json` já aponta o hosting para a pasta `dist/` gerada pelo Vite e faz
o rewrite de todas as rotas para `index.html` (SPA).

## Widget de iPhone (Scriptable)

`scriptable/widget-clube.js` é um widget para a tela de início do iPhone, feito
para o app [Scriptable](https://scriptable.app). Mostra o livro atual e a
corrida da leitura — cada membro na sua cor, com o avanço das últimas 24 h em
dourado, igual ao site.

Ele lê o Firestore pela **API REST**, sem SDK e sem login: as regras já liberam
leitura para todo mundo, e a chave usada é a mesma chave web pública do site.
Só lê — nada no widget altera o clube.

Para instalar: copie o arquivo para um script novo no Scriptable com o nome
"Clube do Livro", e na tela de início adicione um widget do Scriptable
apontando para ele. Funciona nos três tamanhos (mostra 3, 4 ou 9 leitores).

A lógica de cor e da janela de 24 h é uma cópia enxuta de `src/lib/cores.js` e
`src/lib/progresso24h.js` — se mudar a paleta ou a janela lá, atualize aqui
também.

## Estrutura

```
src/
├── firebase.js              # inicialização do Firebase (Firestore + Storage)
├── App.jsx                  # roteamento entre cadastro e clube
├── lib/
│   ├── identity.js          # UUID no localStorage (sessão sem login)
│   ├── db.js                # operações no Firestore
│   ├── storage.js           # upload de imagens
│   ├── cores.js             # paleta, cor de cada membro e sorteio
│   ├── progresso24h.js      # histórico de leitura e ganho das últimas 24 h
│   └── formato.js           # datas, % e utilidades
├── hooks/
│   ├── useColecaoAoVivo.js  # wrapper de onSnapshot
│   └── useDadosClube.js     # membros, livro atual, progresso, mural
├── components/
│   ├── Cadastro.jsx
│   ├── LivroAtualCard.jsx
│   ├── CadastrarLivroModal.jsx
│   ├── Estante.jsx / MembroLivro.jsx
│   ├── PistaCorrida.jsx
│   ├── SeletorCor.jsx       # escolha da cor do membro + prévia da barra
│   ├── AtualizarProgressoModal.jsx
│   ├── Mural.jsx
│   ├── Historico.jsx
│   ├── Modal.jsx
│   └── Icones.jsx           # ícones SVG customizados
└── styles/
    ├── index.css            # tema/base
    └── app.css              # layout e componentes
```

## Modelo de dados (Firestore)

| Coleção            | Documento             | Campos principais                                             |
| ------------------ | --------------------- | ------------------------------------------------------------- |
| `users`            | `{userId}`            | `nome`, `avatarUrl`, `cor`, `criadoEm`                        |
| `livroAtual`       | `{livroId}`           | `titulo`, `autor`, `capaUrl`, `dataLimite`, `ativo`, `iniciadoEm` |
| `progresso`        | `{userId}_{livroId}`  | `userId`, `livroId`, `porcentagem`, `paginaAtual`, `totalPaginas`, `modo`, `historico`, `atualizadoEm` |
| `notas`            | `{notaId}`            | `userId`, `livroId`, `texto`, `desbloqueioPct`, `desbloqueioTipo`, `desbloqueioValor`, `totalPaginas`, `criadoEm` |
| `resenhas`         | `{userId}_{livroId}`  | `userId`, `livroId`, `texto`, `nota`, `atualizadoEm`         |
| `mural`            | `{mensagemId}`        | `userId`, `texto`, `criadoEm`                                 |
| `historicoLivros`  | `{livroId}`           | `titulo`, `autor`, `capaUrl`, `vencedorUserId`, `encerradoEm` |

As resenhas são **liberadas no cliente** apenas para quem terminou o livro
(100%); as notas parciais ficam trancadas até o leitor alcançar `desbloqueioPct`.
Como o app não tem autenticação real, esse controle é de experiência, não de
segurança.

`users.cor` é sempre um hex `#rrggbb`. Se um membro ainda não tem cor, o app
mostra uma da paleta derivada do id dele (estável) e grava um sorteio no
Firestore na primeira vez que alguém abre o site — o sorteio é determinístico,
então dois navegadores fazendo isso ao mesmo tempo chegam ao mesmo resultado.

`progresso.historico` é a trilha que permite saber o que foi lido nas últimas
24 h: uma lista enxuta de marcações `{ pct, em }`, onde `em` são milissegundos
(`Date.now()` — o Firestore não aceita `serverTimestamp()` dentro de arrays). A
% "de 24 h atrás" é a da marcação mais recente anterior à janela; o que veio
depois é o trecho dourado da barra. A lista é podada (mantendo sempre a
marcação âncora anterior à janela) para não inchar o documento. O carimbo vem
do relógio de quem salvou — suficiente para um clube de amigos.

## ⚠️ Aviso de segurança

Sem autenticação real, qualquer pessoa com o link consegue ler e escrever no
Firestore. As _Security Rules_ (`firestore.rules` / `storage.rules`) validam
apenas o **formato** dos dados para evitar escrita malformada — não impedem
acesso. Recomendado para um clube fechado de amigos; **não** divulgue o link
publicamente e a página já vai com `noindex` para não ser indexada.
