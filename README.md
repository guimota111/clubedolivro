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

- **Cadastro sem senha:** nome/apelido + foto (vira o avatar do membro).
- **A Estante:** cada membro é um "livro-termômetro" que se enche de dourado de
  baixo para cima conforme a % de páginas lidas. Reordena ao vivo, do mais
  avançado ao menos avançado, com destaque (coroa + brilho) para o 1º lugar.
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

## Estrutura

```
src/
├── firebase.js              # inicialização do Firebase (Firestore + Storage)
├── App.jsx                  # roteamento entre cadastro e clube
├── lib/
│   ├── identity.js          # UUID no localStorage (sessão sem login)
│   ├── db.js                # operações no Firestore
│   ├── storage.js           # upload de imagens
│   └── formato.js           # datas, % e utilidades
├── hooks/
│   ├── useColecaoAoVivo.js  # wrapper de onSnapshot
│   └── useDadosClube.js     # membros, livro atual, progresso, mural
├── components/
│   ├── Cadastro.jsx
│   ├── LivroAtualCard.jsx
│   ├── CadastrarLivroModal.jsx
│   ├── Estante.jsx / MembroLivro.jsx
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
| `users`            | `{userId}`            | `nome`, `avatarUrl`, `criadoEm`                               |
| `livroAtual`       | `{livroId}`           | `titulo`, `autor`, `totalPaginas`, `capaUrl`, `ativo`, `iniciadoEm` |
| `progresso`        | `{userId}_{livroId}`  | `userId`, `livroId`, `paginaAtual`, `atualizadoEm`            |
| `mural`            | `{mensagemId}`        | `userId`, `texto`, `criadoEm`                                 |
| `historicoLivros`  | `{livroId}`           | `titulo`, `autor`, `capaUrl`, `vencedorUserId`, `encerradoEm` |

## ⚠️ Aviso de segurança

Sem autenticação real, qualquer pessoa com o link consegue ler e escrever no
Firestore. As _Security Rules_ (`firestore.rules` / `storage.rules`) validam
apenas o **formato** dos dados para evitar escrita malformada — não impedem
acesso. Recomendado para um clube fechado de amigos; **não** divulgue o link
publicamente e a página já vai com `noindex` para não ser indexada.
