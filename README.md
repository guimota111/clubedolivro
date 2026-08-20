# 📖 Clube do Livro

Site para um clube do livro entre amigos, onde todos leem o mesmo livro ao mesmo
tempo — ou os vários volumes de uma mesma série — e competem visualmente para
ver quem avança mais rápido, sem login/senha.
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
- **Pista de corrida:** cada membro corre numa raia e o retrato dele fica na
  posição da sua %. No desktop é o formato principal; no celular o membro
  alterna entre **Barras** (a estante) e **Corrida**, e a escolha fica guardada
  no `localStorage`. Sem hover no celular, nome e % saem do cartão flutuante e
  viram uma ficha fixa acima de cada trilho.
- **Livro do clube:** qualquer membro cadastra o livro atual (título, autor,
  série, capa por upload ou URL). Ao trocar de livro, o anterior é arquivado no
  histórico com o vencedor e o progresso de todos zera.
- **Séries: vários livros abertos ao mesmo tempo.** Uma série não se lê em fila
  indiana — parte do clube já está no terceiro volume enquanto outra parte
  termina o segundo. Por isso o clube aceita **mais de um livro em leitura**,
  desde que todos sejam da **mesma série**: basta cadastrar o volume novo com o
  mesmo nome de série dos que já estão abertos e ele entra *ao lado* deles, sem
  encerrar nada nem zerar ninguém. Um trilho abaixo da capa deixa o membro
  escolher em qual volume ele está, e a página inteira passa a ser daquele
  livro — a corrida, o relógio do ciclo e as notas parciais. A escolha fica no
  `localStorage`; na primeira visita vale o livro onde a pessoa marcou
  progresso por último. Livro avulso (sem série) continua sendo um por vez.
  Quando o clube termina um volume antes dos outros, "Encerrar só este livro"
  (na edição do livro) o manda para o histórico com o vencedor da rodada e
  deixa os demais abertos. **Encerrado não é sumido:** o volume continua no
  trilho da série, marcado como tal, com a corrida e as notas dele inteiras —
  e "Reabrir este volume" o devolve à leitura (e o tira do histórico) quando
  ele foi fechado cedo demais, com parte do clube ainda lendo.
- **O próximo livro:** o clube lê um livro por vez, mas quem termina antes não
  fica parado. Ao cruzar os 100%, o leitor destrava uma área onde ele — junto
  com os outros que já terminaram — escolhe o **próximo** livro e começa a ler
  e a marcar progresso desde já. O livro fica "na fila": a corrida do livro de
  agora não muda. Quando o clube decide virar a página, "Tornar o livro do
  clube" arquiva o atual no histórico com o vencedor e promove o da fila —
  quem se adiantou **mantém** o que já andou, porque o progresso está gravado
  pelo id do livro, que não muda na promoção. Quem ainda não terminou vê a
  área trancada, com quanto falta.
- **Aba "Já li":** a estante pessoal de cada membro — os livros do clube que
  **ele** levou até o fim, do mais recente ao mais antigo, com a data em que
  terminou (tirada da trilha de marcações do progresso), a nota que deu e um
  atalho para a resenha. É pessoal por definição: quem nunca terminou um livro
  encerrado não o vê ali. O histórico coletivo do clube continua na aba de
  leitura.
- **Atualizar progresso:** o membro informa apenas a página atual; a % é
  calculada. Botão flutuante fixo, acessível no celular.
- **Novidades:** aba que reúne o que o clube andou fazendo — reações em pontos
  do livro ("Monique se surpreendeu na página 200"), resenhas, comentários e
  avanços de leitura. A lista é montada no cliente a partir do que o app já
  assina ao vivo; não há coleção de eventos no Firestore. Um selo na aba conta
  o que chegou desde a última visita (marco no `localStorage`). Cada aviso leva
  ao que ele conta — a nota (já expandida), a resenha ou a corrida —, com a
  conversa aberta quando o aviso é de comentário. Aviso cujo destino não existe
  para quem está olhando (resenha de livro que essa pessoa não terminou) vira
  texto simples, em vez de um clique que não faz nada.
- **Relógio do ciclo:** mostra quanto falta para o prazo e, ao ser tocado,
  há quanto tempo a leitura começou. O começo vem de `dataInicio` (informável
  ao cadastrar/editar o livro) ou, na falta dele, de `iniciadoEm`.
- **Mural de recados:** post-its que qualquer membro pode deixar.
- **Histórico:** livros já lidos e quem venceu cada rodada. **Vence quem
  chegou primeiro:** só a maior porcentagem não decide nada quando o clube
  inteiro termina o livro — empatados em 100%, ganha quem cruzou a linha antes,
  segundo a trilha de marcações do progresso (`src/lib/vencedor.js`). O
  histórico apura o vencedor na hora de mostrar, e não confia no campo gravado
  no fim da rodada: rodadas encerradas antes desta regra existir apareciam com
  a coroa em quem por acaso o banco devolvia primeiro, e agora aparecem certas.

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

Com uma série aberta o widget não tenta caber três corridas: mostra a do volume
em que mais gente está lendo e diz no rodapé quantos outros livros da série
estão abertos.

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
│   ├── atividades.js        # monta a aba de novidades a partir dos dados vivos
│   ├── reacoes.js           # emojis e como descrevê-los por extenso
│   ├── vencedor.js          # quem venceu a rodada: mais longe e, no empate, antes
│   ├── series.js            # séries: chave, ordem dos volumes e quem entra junto
│   └── formato.js           # datas, % e utilidades
├── hooks/
│   ├── useColecaoAoVivo.js  # wrapper de onSnapshot
│   ├── useDadosClube.js     # membros, livros do clube, progresso, mural
│   └── useFoco.js           # rola até o item apontado por um aviso
├── components/
│   ├── Cadastro.jsx
│   ├── LivroAtualCard.jsx
│   ├── CadastrarLivroModal.jsx
│   ├── Estante.jsx / MembroLivro.jsx
│   ├── PistaCorrida.jsx
│   ├── RelogioCiclo.jsx     # relógio restante / decorrido
│   ├── Atividades.jsx       # aba de novidades
│   ├── ProximoLivro.jsx     # o livro da fila, destravado a quem terminou
│   ├── SeletorLivros.jsx    # o trilho que troca o volume da série em foco
│   ├── MinhaEstante.jsx     # aba "Já li": os livros que EU terminei
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
| `livroAtual`       | `{livroId}`           | `titulo`, `autor`, `capaUrl`, `dataLimite`, `dataInicio`, `serie`, `serieOrdem`, `ativo`, `naFila`, `iniciadoEm` |
| `progresso`        | `{userId}_{livroId}`  | `userId`, `livroId`, `porcentagem`, `paginaAtual`, `totalPaginas`, `modo`, `historico`, `atualizadoEm` |
| `notas`            | `{notaId}`            | `userId`, `livroId`, `texto`, `desbloqueioPct`, `desbloqueioTipo`, `desbloqueioValor`, `totalPaginas`, `criadoEm` |
| `resenhas`         | `{userId}_{livroId}`  | `userId`, `livroId`, `texto`, `nota`, `atualizadoEm`         |
| `mural`            | `{mensagemId}`        | `userId`, `texto`, `criadoEm`                                 |
| `historicoLivros`  | `{livroId}`           | `titulo`, `autor`, `capaUrl`, `serie`, `serieOrdem`, `vencedorUserId`, `encerradoEm` |

A **série** é o que autoriza mais de um `ativo: true` ao mesmo tempo. `serie` é
o nome dela (vazio = livro avulso) e `serieOrdem` o número do volume, usado só
para ordenar. A comparação entre séries é feita por uma chave sem acento, sem
caixa e sem espaço sobrando (`chaveSerie`), então "Cemiterio dos Livros
Esquecidos" e "O Cemitério dos Livros Esquecidos" **não** se juntam por engano,
mas erros de acento sim. O invariante — *todos os livros abertos são da mesma
série* — é mantido no cliente: o cadastro só entra ao lado dos outros quando a
série bate, e a edição tranca o campo de série enquanto houver mais de um livro
aberto. Como todo o resto do app, isso é experiência, não segurança; as regras
validam apenas o formato.

Nada disso muda a chave do que já existe: progresso, notas e resenhas são
gravados por `livroId`, então cada volume tem naturalmente a sua corrida, as
suas notas parciais (com o cadeado medindo a % *daquele* livro) e as suas
resenhas. É também por isso que encerrar e reabrir um volume custa um
booleano: `encerrarLivro` grava o arquivo em `historicoLivros` e põe
`ativo: false`; `reabrirLivro` desfaz os dois. Nenhum documento de leitura é
tocado nas duas operações.

As coleções `livroAtual` e `progresso` são assinadas **inteiras** (um documento
por livro que o clube já leu; um por membro por livro). São poucos, e ter todos
à mão é o que permite manter no trilho os volumes encerrados da série, desenhar
a régua de cada pastilha e apurar o vencedor de rodadas antigas sem uma consulta
por livro.

O **próximo livro** mora na mesma coleção `livroAtual`, e é isso que faz a
promoção não custar nada: ele nasce com `ativo: false` e `naFila: true`, já com
um `livroId` próprio, então progresso, notas e resenhas dele funcionam como as
de qualquer livro. Promover é trocar dois booleanos (`ativo: true`,
`naFila: false`) depois de arquivar o atual — nenhum documento é reescrito e
ninguém perde o que já leu. Sendo ele outro volume da série em leitura, nem o
arquivamento acontece: os booleanos viram e o livro passa a conviver com os
outros. Documentos antigos não têm o campo `naFila`, e por
isso ficam de fora da consulta `where('naFila', '==', true)`. Tirar da fila
também só mexe no booleano: o livro some da tela, mas o que já foi escrito
sobre ele continua gravado.

Uma nota parcial pode ser **só a reação**, sem texto: o emoji já diz o que a
pessoa sentiu, e o ponto do livro vem no selo ao lado. Nota assim não tranca —
não há spoiler a esconder. As regras aceitam `texto` vazio desde que haja
`emoji`.

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
