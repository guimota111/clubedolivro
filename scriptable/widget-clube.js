// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: book-open;

// ============================================================
//  Patoteca — widget para iPhone (app Scriptable)
// ============================================================
//
// Mostra a corrida da leitura na tela de início: cada membro com a sua barra
// na cor que escolheu e, na ponta, em DOURADO, o que avançou nas últimas 24 h.
//
// Como usar:
//   1. Instale o app Scriptable (gratuito, App Store).
//   2. Novo script (+), cole este arquivo inteiro e dê o nome "Patoteca".
//   3. Na tela de início: segure a tela -> (+) -> Scriptable -> escolha o
//      tamanho -> toque no widget -> em "Script" escolha "Patoteca".
//
// Ele só LÊ os dados — nada aqui altera o clube.

// ---------- Configuração ----------

const PROJETO = 'clube-do-livro-16073'
// Mesma chave pública que o site usa (é a chave web do Firebase, não é senha).
const CHAVE = 'AIzaSyC13IYCYsIJohGhmEj-kCQixQsA49Dr4d8'

// Opcional: escreva seu nome igual ao do clube para a sua linha ganhar um
// marcador. Deixe '' se não quiser.
const MEU_NOME = ''

// ---------- Paleta (igual à do site, src/lib/cores.js) ----------

const PALETA = [
  '#d1403a', '#e0714f', '#a03555', '#dd5f9c',
  '#b95fcc', '#8a63d8', '#5570d4', '#3f92d2',
  '#2aa6a6', '#35a06b', '#8aa63c', '#b9c2cc',
]

const DOURADO = '#c9a227'
const DOURADO_BRILHO = '#f4d97b'
const JANELA_24H = 24 * 60 * 60 * 1000

// Hash estável: o mesmo id sempre cai na mesma cor, igual ao site.
function hashTexto(txt) {
  let h = 2166136261
  const s = String(txt || '')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h | 0)
}

function corDoMembro(membro) {
  const c = String(membro.cor || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c
  // Membro que ainda não tem cor gravada: usa a mesma derivação do site. Pode
  // sair diferente da cor que o site vai sortear (lá ele evita repetir cores
  // já em uso), mas isso dura só até alguém abrir o site — daí a cor é
  // gravada e os dois passam a mostrar a mesma.
  return PALETA[hashTexto(membro.id || '') % PALETA.length]
}

// ---------- Leitura do Firestore (API REST, sem login) ----------

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`

// Converte os valores tipados que a API REST devolve em valores JS normais.
function valor(v) {
  if (!v) return null
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return Number(v.doubleValue)
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return new Date(v.timestampValue)
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valor)
  if ('mapValue' in v) return campos(v.mapValue.fields)
  return null
}

function campos(f) {
  const o = {}
  for (const k in f || {}) o[k] = valor(f[k])
  return o
}

function paraDoc(d) {
  const o = campos(d.fields)
  o.id = String(d.name || '').split('/').pop()
  return o
}

async function listar(colecao) {
  const r = new Request(`${BASE}/${colecao}?key=${CHAVE}&pageSize=300`)
  r.timeoutInterval = 15
  const json = await r.loadJSON()
  if (json.error) throw new Error(json.error.message || 'Erro no Firestore')
  return (json.documents || []).map(paraDoc)
}

// Busca só o progresso do livro atual, em vez de baixar o histórico inteiro.
async function progressoDoLivro(livroId) {
  const r = new Request(`${BASE}:runQuery?key=${CHAVE}`)
  r.method = 'POST'
  r.headers = { 'Content-Type': 'application/json' }
  r.body = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'progresso' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'livroId' },
          op: 'EQUAL',
          value: { stringValue: livroId },
        },
      },
    },
  })
  r.timeoutInterval = 15
  const json = await r.loadJSON()
  if (json.error) throw new Error(json.error.message || 'Erro no Firestore')
  return (Array.isArray(json) ? json : [])
    .filter((l) => l.document)
    .map((l) => paraDoc(l.document))
}

// ---------- Regras de progresso (iguais às do site) ----------

function limitarPct(n) {
  const v = Math.round(Number(n))
  if (!isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}

function pctDoProgresso(prog, totalPaginas) {
  if (!prog) return 0
  if (typeof prog.porcentagem === 'number') return limitarPct(prog.porcentagem)
  if (typeof prog.paginaAtual === 'number' && totalPaginas > 0) {
    return limitarPct((prog.paginaAtual / totalPaginas) * 100)
  }
  return 0
}

// Divide a % em acumulado (cor do membro) e ganho das últimas 24 h (dourado).
function faixas(prog, pct) {
  const lista = (Array.isArray(prog && prog.historico) ? prog.historico : [])
    .filter((m) => m && isFinite(Number(m.pct)) && isFinite(Number(m.em)))
    .map((m) => ({ pct: limitarPct(m.pct), em: Number(m.em) }))
    .sort((a, b) => a.em - b.em)

  // Progresso antigo, sem histórico: não dá para saber o que é recente.
  if (!lista.length) return { base: pct, recente: 0 }

  const limite = Date.now() - JANELA_24H
  let base = null
  for (const m of lista) {
    if (m.em > limite) break
    base = m.pct
  }
  // Nenhuma marcação antes da janela: leu tudo isso nas últimas 24 h.
  if (base == null) base = 0
  base = Math.max(0, Math.min(base, pct))
  return { base, recente: pct - base }
}

// ---------- Desenho das barras ----------

// Retângulo com as pontas arredondadas (o DrawContext não tem isso pronto).
function pilula(dc, x, y, w, h, cor, alfa) {
  if (w <= 0) return
  dc.setFillColor(new Color(cor, alfa == null ? 1 : alfa))
  const r = h / 2
  if (w <= h) {
    dc.fillEllipse(new Rect(x, y, w, h))
    return
  }
  dc.fillRect(new Rect(x + r, y, w - h, h))
  dc.fillEllipse(new Rect(x, y, h, h))
  dc.fillEllipse(new Rect(x + w - h, y, h, h))
}

function barra(largura, altura, base, recente, cor) {
  const dc = new DrawContext()
  dc.size = new Size(largura, altura)
  dc.opaque = false
  dc.respectScreenScale = true

  // Trilho vazio.
  pilula(dc, 0, 0, largura, altura, '#000000', 0.45)

  const fim = ((base + recente) / 100) * largura
  let corte = (base / 100) * largura

  // Um ganho de 1% viraria um fiapo invisível. Quando há avanço recente,
  // garantimos ao dourado uma faixa mínima — o número exato aparece no
  // "+X%" ao lado do nome.
  if (recente > 0) corte = Math.max(0, Math.min(corte, fim - Math.max(altura, 3)))

  // Pinta primeiro a barra inteira (dourada se houve avanço recente, para a
  // ponta direita já sair arredondada) e sobrepõe o acumulado na cor do
  // membro. Assim os dois pedaços se encaixam sem fresta na emenda.
  if (fim > 0) {
    pilula(dc, 0, 0, fim, altura, recente > 0 ? DOURADO_BRILHO : cor)
    if (corte > 0) pilula(dc, 0, 0, corte, altura, cor)
  }

  return dc.getImage()
}

// ---------- Montagem do widget ----------

const familia = config.widgetFamily || 'medium'
const PEQUENO = familia === 'small'
const GRANDE = familia === 'large' || familia === 'extraLarge'

const LARGURA_BARRA = PEQUENO ? 122 : GRANDE ? 300 : 290
const MAX_LINHAS = PEQUENO ? 3 : GRANDE ? 9 : 4

const w = new ListWidget()
w.setPadding(12, 14, 12, 14)
const fundo = new LinearGradient()
fundo.colors = [new Color('#2b1d13'), new Color('#1a120b')]
fundo.locations = [0, 1]
w.backgroundGradient = fundo
// O widget se atualiza sozinho de meia em meia hora (o iOS decide a hora exata).
w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000)

try {
  const [membros, livros] = await Promise.all([
    listar('users'),
    listar('livroAtual'),
  ])

  // O clube pode ter VÁRIOS livros abertos ao mesmo tempo, quando são de uma
  // mesma série. Num widget não cabem três corridas: ele mostra a do volume
  // mais lido — o que tem mais gente com progresso — e diz qual é no rodapé.
  const ativos = livros
    .filter((l) => l.ativo)
    .sort((a, b) => (b.iniciadoEm || 0) - (a.iniciadoEm || 0))
  const { livro, progressos } = await escolherVolume(ativos)

  if (!livro) {
    titulo('Patoteca')
    recado('Nenhum livro em leitura agora.')
  } else {
    const porUsuario = {}
    progressos.forEach((p) => {
      porUsuario[p.userId] = p
    })

    const linhas = membros
      .map((m) => {
        const prog = porUsuario[m.id]
        const pct = pctDoProgresso(prog, livro.totalPaginas || 0)
        return { nome: m.nome || 'Membro', pct, cor: corDoMembro(m), ...faixas(prog, pct) }
      })
      .sort((a, b) => (b.pct !== a.pct ? b.pct - a.pct : a.nome.localeCompare(b.nome)))

    titulo(livro.titulo || 'Patoteca')

    if (!linhas.length) {
      recado('A pista ainda está vazia.')
    } else {
      const mostradas = linhas.slice(0, MAX_LINHAS)
      mostradas.forEach((l, i) => {
        if (i > 0) w.addSpacer(PEQUENO ? 5 : 7)
        linha(l, i === 0)
      })

      const sobraram = linhas.length - mostradas.length
      const restoDaSerie = ativos.length - 1
      w.addSpacer(4)
      rodape(
        [
          sobraram > 0 ? `+${sobraram} leitor${sobraram > 1 ? 'es' : ''}` : '',
          restoDaSerie > 0
            ? `+${restoDaSerie} livro${restoDaSerie > 1 ? 's' : ''} da série`
            : '',
        ]
          .filter(Boolean)
          .join(' · ')
      )
    }
  }
} catch (e) {
  titulo('Patoteca')
  recado('Não consegui carregar agora.')
  rodape(String(e.message || e).slice(0, 60))
}

// Com uma série aberta, o widget mostra o volume em que mais gente está
// lendo. Empate (ou um livro só) resolve pelo mais recente, que é a ordem em
// que os ativos já chegam aqui.
async function escolherVolume(ativos) {
  if (!ativos.length) return { livro: null, progressos: [] }
  if (ativos.length === 1) {
    return { livro: ativos[0], progressos: await progressoDoLivro(ativos[0].id) }
  }
  let escolhido = { livro: ativos[0], progressos: [] }
  let maisLeitores = -1
  for (const candidato of ativos) {
    const progressos = await progressoDoLivro(candidato.id)
    const leitores = progressos.filter((p) => Number(p.porcentagem) > 0).length
    if (leitores > maisLeitores) {
      maisLeitores = leitores
      escolhido = { livro: candidato, progressos }
    }
  }
  return escolhido
}

function titulo(txt) {
  const t = w.addText(txt)
  t.font = Font.semiboldSystemFont(PEQUENO ? 13 : 15)
  t.textColor = new Color('#e0b94d')
  t.lineLimit = PEQUENO ? 2 : 1
  t.minimumScaleFactor = 0.8
  w.addSpacer(PEQUENO ? 7 : 9)
}

function linha(l, lider) {
  const topo = w.addStack()
  topo.centerAlignContent()

  const marcaEu = MEU_NOME && l.nome.trim().toLowerCase() === MEU_NOME.trim().toLowerCase()
  const tNome = topo.addText(`${lider ? '👑 ' : ''}${l.nome}${marcaEu ? ' •' : ''}`)
  tNome.font = Font.systemFont(PEQUENO ? 11 : 12)
  tNome.textColor = new Color('#f0e6d2')
  tNome.lineLimit = 1
  tNome.minimumScaleFactor = 0.7

  topo.addSpacer()

  // O ganho das últimas 24 h vem em dourado, colado na porcentagem.
  if (l.recente > 0) {
    const tGanho = topo.addText(`+${l.recente}% `)
    tGanho.font = Font.boldSystemFont(PEQUENO ? 10 : 11)
    tGanho.textColor = new Color(DOURADO_BRILHO)
  }

  const tPct = topo.addText(`${l.pct}%`)
  tPct.font = Font.semiboldSystemFont(PEQUENO ? 11 : 12)
  tPct.textColor = new Color('#a99a7d')

  w.addSpacer(3)
  const img = w.addImage(barra(LARGURA_BARRA, PEQUENO ? 7 : 8, l.base, l.recente, l.cor))
  img.imageSize = new Size(LARGURA_BARRA, PEQUENO ? 7 : 8)
  img.applyFittingContentMode()
}

function recado(txt) {
  const t = w.addText(txt)
  t.font = Font.systemFont(PEQUENO ? 11 : 12)
  t.textColor = new Color('#a99a7d')
  t.lineLimit = 2
}

function rodape(extra) {
  w.addSpacer(2)
  const agora = new Date()
  const hora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  const t = w.addText(extra ? `${extra} · ${hora}` : hora)
  t.font = Font.systemFont(9)
  t.textColor = new Color('#a99a7d', 0.7)
  t.lineLimit = 1
}

if (config.runsInWidget) {
  Script.setWidget(w)
} else if (PEQUENO) {
  await w.presentSmall()
} else if (GRANDE) {
  await w.presentLarge()
} else {
  await w.presentMedium()
}
Script.complete()
