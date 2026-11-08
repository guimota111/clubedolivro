# 🦆 Patoteca

Site para um clube do livro entre amigos — a Patoteca —, onde todos leem o mesmo livro ao mesmo
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
- **App instalável (PWA):** manifest + service worker, para ficar na tela de
  início do celular como um app de verdade
- **Avisos no celular:** Web Push, entregue por um Cloudflare Worker (`worker/`)
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
  pelo id do livro, que não muda na promoção. A fila é de todo mundo — ver,
  corrigir e "Tornar o livro do clube" não exigem ter terminado o atual; só
  **adiantar a leitura** do próximo (marcar progresso nele) fica trancado, com
  quanto falta. A fila inteira aparece com setas para **trocar a ordem**: isso
  grava `filaPosicao` (1, 2, 3…) em cada livro, e a partir daí vale essa
  ordem — quem entra depois sem posição (um eleito, um cadastro) fica atrás de
  todos. Um livro tirado da fila sem ter sido lido não vira "anterior":
  ele aparece em "Fora da fila" na mesma página, com um botão para voltar (ao
  fim da fila).
- **Um menu, uma página por assunto.** O site se organiza num menu fixo no
  topo — **Livro atual · Anteriores · Livros lidos · Patos · Mural · Próximo
  livro · Eleição** — e as novidades moram num **sininho** no cabeçalho. A
  página fica no `#hash` da barra de endereço (`src/lib/rotas.js`), então o
  botão voltar do celular desfaz o último passo, recarregar volta para onde a
  pessoa estava e um link para `#/patos/<id>` abre direto no perfil certo.
- **Livro atual** em três sub-abas: **Corrida** (com o relógio do ciclo),
  **Notas** parciais e **Resenhas**. É a mesma `PaginaLivro` que serve aos
  **Anteriores**: um trilho de capas escolhe um livro encerrado e ele abre no
  mesmo formato — corrida, notas e resenhas —, e o botão "Meu progresso" marca
  a leitura **nele**. Quem ficou para trás continua a sua corrida ali, em vez
  de olhar uma lista morta.
- **Livros lidos:** todos os livros que passaram pelo clube, com o placar de
  cada um — quem terminou primeiro, quantos terminaram, quantos começaram e
  pararam, quantos nem abriram (`src/lib/estatisticas.js`) — e as resenhas de
  cada um a um toque. "Reabrir" devolve um encerrado à leitura, quando não
  quebra a regra da série.
- **Patos:** o ranking do clube e o perfil de cada leitor — na Patoteca desde
  quando, livros terminados, vezes que terminou em primeiro, tempo médio por
  livro, se costuma começar cedo ou tarde em relação ao clube, o ritmo (% por
  dia) e o que está lendo agora — mais a **estante pessoal** do que ele já leu
  (a antiga aba "Já li"), com a data em que terminou, a nota e a resenha. As
  contas saem do progresso gravado; o "quando começou" de cada livro vem do
  campo `comecadoEm`, gravado na primeira marcação de progresso (a trilha de
  24 h é podada e perderia essa data) — para progresso anterior ao campo vale
  a marcação mais antiga que sobrou, e o perfil avisa quando não dá para medir.
- **Atualizar progresso:** o membro informa apenas a página atual; a % é
  calculada. Botão flutuante fixo, acessível no celular.
- **Novidades:** o sininho no cabeçalho reúne o que o clube andou fazendo —
  reações em pontos do livro ("Monique se surpreendeu na página 200"),
  resenhas, comentários e avanços de leitura. A lista é montada no cliente a
  partir do que o app já assina ao vivo; não há coleção de eventos no
  Firestore. Um selo no sino conta o que chegou desde a última visita (marco
  no `localStorage`). Cada aviso leva ao que ele conta — a nota (já
  expandida), a resenha ou a corrida, na página do livro atual ou na dos
  anteriores, conforme onde o livro estiver —, com a
  conversa aberta quando o aviso é de comentário. Aviso cujo destino não existe
  para quem está olhando (resenha de livro que essa pessoa não terminou) vira
  texto simples, em vez de um clique que não faz nada.
- **Relógio do ciclo:** mostra quanto falta para o prazo e, ao ser tocado,
  há quanto tempo a leitura começou. O começo vem de `dataInicio` (informável
  ao cadastrar/editar o livro) ou, na falta dele, de `iniciadoEm`.
- **Mural de recados:** post-its que qualquer membro pode deixar.
- **Vencedor de cada rodada** (na página de livros lidos). **Vence quem
  chegou primeiro:** só a maior porcentagem não decide nada quando o clube
  inteiro termina o livro — empatados em 100%, ganha quem cruzou a linha antes,
  segundo a trilha de marcações do progresso (`src/lib/vencedor.js`). O
  histórico apura o vencedor na hora de mostrar, e não confia no campo gravado
  no fim da rodada: rodadas encerradas antes desta regra existir apareciam com
  a coroa em quem por acaso o banco devolvia primeiro, e agora aparecem certas.

- **Avisos no celular:** quem quiser recebe uma notificação quando alguém deixa
  uma nota, comenta, escreve uma resenha, termina um livro ou o clube começa
  uma leitura nova. O toque na notificação abre o app exatamente no que ela
  conta. Liga-se por aparelho, no "Editar perfil". Detalhes abaixo.

- **Eleição do próximo livro:** em vez de alguém trocar o livro, o clube
  elege. Com a **senha da urna**, abre-se uma eleição (com prazos opcionais
  para indicar e para votar, e **quantos livros ela elege** — um, dois ou
  três). Cada membro **indica até 2 livros** — a busca na Google Books puxa
  capa, autor e número de páginas, tudo corrigível — e escreve um texto
  defendendo cada um. Quem indica pode marcar que o livro **faz parte de uma
  coleção**: se ele vencer, os próximos livros do clube serão os da série.
  Indicar e votar acontecem **ao mesmo tempo**: cada membro tem **2 votos**
  entre os indicados, nunca nos próprios, e muda indicações e votos à vontade
  enquanto a eleição está aberta (corrigir uma indicação apaga os votos que ela
  já tinha, e o clube é avisado). Abster-se é só não votar. A aba **Eleição** é
  uma prateleira de capas, embaralhada de forma fixa: tocar numa capa abre a
  defesa e o botão de votar. **Ninguém vê quem indicou o quê nem a contagem**
  até a **apuração**.
- **A apuração é um espetáculo:** feita por quem tem a senha, na frente do
  clube (projetando ou compartilhando a tela). As cédulas saem da urna **uma a
  uma**, cada uma com **o nome de quem votou** e o livro; o placar reordena ao
  vivo, com as vagas em dourado, e as três últimas cédulas chegam com **rufar
  de tambores**. Espaço e seta para a direita puxam a próxima cédula; dá para
  silenciar o som e para revelar tudo de uma vez. Fechar sem querer não perde
  nada: a revelação retoma da mesma cédula. No fim, o **pódio** com confete
  revela quem indicou cada eleito. Os eleitos **entram na fila do próximo
  livro na ordem da votação** — o 1º é o próximo livro, o 2º vem logo atrás
  (quando os dois empatam, quem apura pode inverter a ordem). Nem todo mundo
  terminou o de agora, então ninguém é tirado da leitura; quem já terminou
  começa o 1º da fila, e "Tornar o livro do clube" vira a página quando o
  clube decidir — o seguinte assume a fila sozinho. Empate na beira do corte
  (por exemplo, dois livros disputando a última vaga) abre um **novo turno** só
  entre os empatados pelas vagas que faltam (1 voto por pessoa por vaga; os já
  eleitos ficam guardados), ou é desempatado ali na conversa e registrado. As
  eleições encerradas ficam na mesma aba, com o resultado completo e a posição
  de cada eleito. A página Eleição está sempre no menu; sem eleição aberta ela
  mostra a última encerrada e as anteriores recolhidas.

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
"Patoteca", e na tela de início adicione um widget do Scriptable
apontando para ele. Funciona nos três tamanhos (mostra 3, 4 ou 9 leitores).

A lógica de cor e da janela de 24 h é uma cópia enxuta de `src/lib/cores.js` e
`src/lib/progresso24h.js` — se mudar a paleta ou a janela lá, atualize aqui
também.

## Instalar no celular

O site é um PWA: dá para deixá-lo na tela de início como um app.

- **iPhone:** abra no Safari, toque em Compartilhar e em "Adicionar à Tela de
  Início".
- **Android:** o Chrome oferece "Instalar aplicativo" sozinho; se não oferecer,
  está no menu de três pontos.

No iPhone isso não é enfeite: **os avisos só funcionam com o app instalado na
tela de início**. A Apple não entrega Web Push para site aberto no Safari
comum. Exige iOS 16.4 ou mais novo.

## Avisos no celular (Web Push)

Como um aviso viaja, do começo ao fim:

1. O membro liga os avisos no "Editar perfil". O navegador cria uma
   **inscrição** — uma URL secreta na Apple ou no Google, a caixa postal
   daquele aparelho — e ela vai para `inscricoesPush`.
2. Alguém escreve uma nota. O navegador de quem escreveu chama
   `anunciar()` (`src/lib/push.js`), que bate no worker.
3. O worker (`worker/index.js`) lê as inscrições, **criptografa** o texto para
   cada aparelho, assina com a chave VAPID e entrega. Nem a Apple nem o Google
   conseguem ler o conteúdo.
4. O service worker (`public/sw.js`) acorda no celular, mostra a notificação e,
   no toque, abre o app no lugar certo.

O que vira aviso: nota nova, comentário, primeira versão de uma resenha, alguém
terminando um livro e o clube começando uma leitura nova. O que **não** vira:
progresso comum (marcar 20% num domingo encheria o celular de todo mundo),
edição de nota e reescrita de resenha.

Quem escreveu nunca recebe o próprio aviso.

O texto da notificação é o mesmo do feed de novidades, de propósito: as frases
moram em `src/lib/atividades.js` e são usadas nos dois lugares, para as duas
telas nunca contarem a mesma coisa com palavras diferentes.

**Para ligar isto num clube novo**, é preciso publicar o worker uma vez: veja
[`worker/README.md`](worker/README.md). Enquanto as três constantes no topo de
`src/lib/push.js` estiverem vazias, o app funciona normalmente — o perfil só
avisa que as notificações ainda não foram configuradas.

## Estrutura

```
src/
├── firebase.js              # inicialização do Firebase (Firestore + Storage)
├── App.jsx                  # cadastro ou clube; monta cada página do menu pela rota
├── lib/
│   ├── rotas.js             # a página no #hash: ler e escrever { pagina, id, sub }
│   ├── estatisticas.js      # placar de cada livro e as contas de cada pato
│   ├── identity.js          # UUID no localStorage (sessão sem login)
│   ├── db.js                # operações no Firestore
│   ├── storage.js           # upload de imagens
│   ├── cores.js             # paleta, cor de cada membro e sorteio
│   ├── progresso24h.js      # histórico de leitura e ganho das últimas 24 h
│   ├── atividades.js        # monta a aba de novidades e as frases dos avisos
│   ├── push.js              # avisos no celular: inscrição do aparelho e disparo
│   ├── reacoes.js           # emojis e como descrevê-los por extenso
│   ├── vencedor.js          # quem venceu a rodada: mais longe e, no empate, antes
│   ├── series.js            # séries: chave, ordem dos volumes e quem entra junto
│   ├── eleicao.js           # eleição: regras, apuração por vaga, turnos, cédulas e a ordem das capas
│   ├── som.js               # os sons da apuração, sintetizados na hora
│   ├── urna.js              # a senha da urna (só o resumo SHA-256 fica no código)
│   ├── livrosApi.js         # busca de livros na Google Books
│   └── formato.js           # datas, % e utilidades
├── hooks/
│   ├── useColecaoAoVivo.js  # wrapper de onSnapshot
│   ├── useDadosClube.js     # membros, livros do clube, progresso, mural, eleição
│   ├── useRota.js           # a rota atual (hashchange) e `navegar`
│   └── useFoco.js           # rola até o item apontado por um aviso
├── components/
│   ├── Cadastro.jsx
│   ├── Menu.jsx             # o menu principal, o sininho e as sub-abas
│   ├── PaginaLivro.jsx      # um livro em três sub-abas: corrida, notas, resenhas
│   ├── LivrosAnteriores.jsx # o trilho dos livros encerrados
│   ├── LivrosLidos.jsx      # todos os livros do clube, com placar e resenhas
│   ├── Patos.jsx            # ranking dos leitores e o perfil de cada um
│   ├── LivroAtualCard.jsx
│   ├── CadastrarLivroModal.jsx
│   ├── Estante.jsx / MembroLivro.jsx
│   ├── PistaCorrida.jsx
│   ├── RelogioCiclo.jsx     # relógio restante / decorrido
│   ├── Atividades.jsx       # a página de novidades (atrás do sininho)
│   ├── ProximoLivro.jsx     # o livro da fila, destravado a quem terminou
│   ├── SeletorLivros.jsx    # o trilho que troca o volume da série em foco
│   ├── Resenhas.jsx         # as resenhas de um livro (formulário + lista)
│   ├── Eleicao.jsx          # página da eleição: prateleira, livro aberto, resultados
│   ├── IndicarLivroModal.jsx # indicar um livro: busca + formulário + defesa
│   ├── ApuracaoModal.jsx    # a urna: senha, revelação voto a voto, pódio ou novo turno
│   ├── Confete.jsx          # a chuva de confete do pódio
│   ├── AbrirEleicaoModal.jsx # abre uma eleição (com a senha)
│   ├── SenhaUrnaModal.jsx   # pede a senha antes de cancelar
│   ├── SeletorCor.jsx       # escolha da cor do membro + prévia da barra
│   ├── AtualizarProgressoModal.jsx
│   ├── AvisosNoCelular.jsx  # o interruptor dos avisos, dentro do perfil
│   ├── Mural.jsx
│   ├── Modal.jsx
│   └── Icones.jsx           # ícones SVG customizados
└── styles/
    ├── index.css            # tema/base
    ├── app.css              # layout e componentes
    └── menu.css             # o menu, o sino, as sub-abas, livros lidos e patos

public/
├── icone.svg                # o pato: fonte de todos os ícones
├── icone-*.png              # gerados por scripts/gerar-icones.mjs
├── manifest.webmanifest     # nome, cores e ícones do app instalado
└── sw.js                    # service worker: mostra os avisos e trata o toque

worker/                      # o carteiro dos avisos (Cloudflare Worker)
├── index.js                 # recebe, lê as inscrições, entrega, limpa as mortas
├── webpush.js               # VAPID (RFC 8292) + criptografia (RFC 8291)
├── webpush.teste.mjs        # confere a criptografia com uma biblioteca de fora
└── gerar-chaves.mjs         # cria o par de chaves VAPID
```

## Modelo de dados (Firestore)

| Coleção            | Documento             | Campos principais                                             |
| ------------------ | --------------------- | ------------------------------------------------------------- |
| `users`            | `{userId}`            | `nome`, `avatarUrl`, `cor`, `criadoEm`                        |
| `livroAtual`       | `{livroId}`           | `titulo`, `autor`, `capaUrl`, `dataLimite`, `dataInicio`, `serie`, `serieOrdem`, `ativo`, `naFila`, `filaOrdem`, `filaPosicao`, `iniciadoEm` |
| `progresso`        | `{userId}_{livroId}`  | `userId`, `livroId`, `porcentagem`, `paginaAtual`, `totalPaginas`, `modo`, `historico`, `comecadoEm`, `atualizadoEm` |
| `inscricoesPush`   | `{resumo do endpoint}` | `userId`, `endpoint`, `p256dh`, `auth`, `criadoEm` — um por aparelho que ligou os avisos |
| `notas`            | `{notaId}`            | `userId`, `livroId`, `texto`, `desbloqueioPct`, `desbloqueioTipo`, `desbloqueioValor`, `totalPaginas`, `criadoEm` |
| `resenhas`         | `{userId}_{livroId}`  | `userId`, `livroId`, `texto`, `nota`, `atualizadoEm`         |
| `mural`            | `{mensagemId}`        | `userId`, `texto`, `criadoEm`                                 |
| `historicoLivros`  | `{livroId}`           | `titulo`, `autor`, `capaUrl`, `serie`, `serieOrdem`, `vencedorUserId`, `encerradoEm` |
| `eleicoes`         | `{eleicaoId}`         | `nome`, `status` (`aberta`/`empatada`/`encerrada`/`cancelada`), `turno`, `finalistas`, `vagas`, `eleitos`, `prazoIndicacoes`, `prazoVotacao`, `apuracoes`, `vencedorIndicacaoId`, `vencedoresIndicacaoIds`, `livroId`, `livrosIds`, `criadoEm`, `encerradaEm` |
| `indicacoes`       | `{indicacaoId}`       | `eleicaoId`, `userId`, `titulo`, `autor`, `capaUrl`, `totalPaginas`, `serie`, `serieOrdem`, `texto`, `fonteId`, `criadoEm`, `atualizadoEm` |
| `votos`            | `{eleicaoId}_{turno}_{userId}` | `eleicaoId`, `turno`, `userId`, `indicacoes` (até 2 ids), `atualizadoEm` |

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
tocado nas duas operações. O histórico oferece **Reabrir** em cada livro
(quando não há nada em leitura, ou o livro é da série em leitura), e a edição
do livro atual tem **Tirar da leitura sem arquivar** (`retirarLivroDaLeitura`):
juntos, são o desfazer de um "Trocar o livro do clube" feito por engano, que
encerra a série inteira de uma vez — por isso essa troca agora pede
confirmação.

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
sobre ele continua gravado. A fila pode ter **mais de um livro** — uma eleição
que elege dois põe os dois ali — e é por ordem de chegada (`iniciadoEm`, com
`filaOrdem` desempatando os que entraram no mesmo instante): o próximo livro é
sempre o primeiro dela, e promovê-lo deixa o seguinte na frente, sem mexer em
nada.

A **eleição** mora em três coleções. `eleicoes` tem um documento por eleição,
e só uma fica em andamento por vez (`aberta` ou `empatada`). `indicacoes` tem
um livro por documento, com `userId` de quem indicou — o anonimato é feito na
tela, que simplesmente não mostra o nome até a apuração; como todo o resto do
app, é experiência, não segurança. `votos` tem **um documento por pessoa por
turno**, com a lista de até dois ids de indicação: mudar o voto é sobrescrever
o próprio documento, e apagar os votos de uma indicação corrigida é um
`arrayRemove` em quem a carregava. A contagem nunca é gravada antes da hora: a
**apuração** acontece no navegador de quem tem a senha (`apurar()` em
`lib/eleicao.js`, que também descarta voto no próprio livro, repetido ou fora
da disputa) e grava em `apuracoes` os totais e os empatados daquele turno — é
isso que a tela de resultado mostra para sempre. Com vencedor, a eleição fecha
e `cadastrarProximoLivro` o coloca na fila (`naFila: true`), de onde o fluxo
de sempre o promove; com empate, `turno` sobe, `finalistas`
guarda os empatados e os votos recomeçam em documentos novos (o turno faz parte
do id), com um voto por pessoa.

A **senha da urna** não está em lugar nenhum do repositório: `lib/urna.js`
guarda só o resumo SHA-256 dela e compara com o que o membro digita. Para
trocar, gere um novo resumo (a instrução está no arquivo) e substitua.

A **busca de livros** (`lib/livrosApi.js`) tenta a Google Books e, se ela
falhar ou não achar nada, a Open Library (que não precisa de chave). A Google
Books **exige chave**: sem ela recusa a consulta com "cota zero". O código usa
a chave web do próprio projeto Firebase, mas ela só vale depois de, no
[Google Cloud](https://console.cloud.google.com/apis/library/books.googleapis.com?project=clube-do-livro-16073),
**ativar a Books API** e, em *APIs e serviços → Credenciais*, liberá-la nas
restrições de API da chave (ou deixar a chave sem restrição de API). Há também
uma constante para colar a chave de outro projeto que já tenha a Books API.

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

O mesmo vale para os avisos: o `TOKEN_DE_ENVIO` do worker viaja no JavaScript do
site, então quem lê o código consegue disparar uma notificação falsa para o
clube. Ele serve para o worker ignorar quem apenas esbarrou na URL, não como
senha. Já o **conteúdo** dos avisos é criptografado ponta a ponta, e a chave
privada VAPID nunca sai do worker — ninguém consegue ler os avisos alheios nem
se passar pelo clube sem ela.
