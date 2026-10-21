// Busca de livros na Google Books, para a indicação não exigir que ninguém
// digite autor e número de páginas na mão (mas tudo pode ser corrigido depois).
//
// A API aceita consultas sem chave, com uma cota por dia por endereço. Se a
// cota apertar, basta criar uma chave da Google Books API no Google Cloud e
// colá-la abaixo — o resto não muda.
const CHAVE_GOOGLE_BOOKS = ''

const ENDERECO = 'https://www.googleapis.com/books/v1/volumes'
const CAMPOS =
  'items(id,volumeInfo(title,subtitle,authors,pageCount,language,imageLinks,publishedDate,publisher,industryIdentifiers))'
const POR_BUSCA = 12

// Parece um ISBN? Dez ou treze dígitos (o décimo pode ser X), com ou sem
// hífens. Aí a busca é exata, em vez de procurar os números no título.
export function pareceIsbn(texto) {
  const limpo = (texto || '').replace(/[-\s]/g, '')
  return /^(\d{9}[\dXx]|\d{13})$/.test(limpo) ? limpo : ''
}

// Devolve uma lista de candidatos já no formato que a indicação usa:
//   { fonteId, titulo, autor, totalPaginas, capaUrl, idioma, ano, editora }
//
// Faz duas consultas ao mesmo tempo — só edições em português e sem filtro de
// idioma — e junta as duas, com as em português na frente: o clube lê em
// português, mas uma edição estrangeira ainda serve para puxar a capa e as
// páginas quando a brasileira não está catalogada.
export async function buscarLivros(termo) {
  const limpo = (termo || '').trim()
  if (!limpo) return []
  const isbn = pareceIsbn(limpo)
  const q = isbn ? `isbn:${isbn}` : limpo

  const respostas = await Promise.allSettled([
    consultar(q, { langRestrict: 'pt' }),
    consultar(q, {}),
  ])
  const falhas = respostas.filter((r) => r.status === 'rejected')
  if (falhas.length === respostas.length) throw falhas[0].reason

  const vistos = new Set()
  const lista = []
  respostas.forEach((r) => {
    if (r.status !== 'fulfilled') return
    r.value.forEach((item) => {
      if (!item || vistos.has(item.fonteId) || !item.titulo) return
      vistos.add(item.fonteId)
      lista.push(item)
    })
  })
  return lista
}

async function consultar(q, extras) {
  const params = new URLSearchParams({
    q,
    maxResults: String(POR_BUSCA),
    printType: 'books',
    fields: CAMPOS,
    ...extras,
  })
  if (CHAVE_GOOGLE_BOOKS) params.set('key', CHAVE_GOOGLE_BOOKS)
  const resposta = await fetch(`${ENDERECO}?${params}`)
  if (!resposta.ok) throw new Error(`Google Books respondeu ${resposta.status}`)
  const corpo = await resposta.json()
  return (corpo.items || []).map(converter)
}

function converter(item) {
  const v = item?.volumeInfo || {}
  const titulo = [v.title, v.subtitle].filter(Boolean).join(': ')
  return {
    fonteId: item.id,
    titulo,
    autor: Array.isArray(v.authors) ? v.authors.join(', ') : '',
    totalPaginas: Number.isFinite(v.pageCount) && v.pageCount > 0 ? v.pageCount : null,
    capaUrl: urlDaCapa(v.imageLinks),
    idioma: v.language || '',
    ano: (v.publishedDate || '').slice(0, 4),
    editora: v.publisher || '',
  }
}

// A miniatura vem em http e com uma "orelha" dobrada desenhada por cima
// (`edge=curl`). Troca para https — o site é https e o navegador bloquearia a
// imagem — e tira a orelha.
function urlDaCapa(imageLinks) {
  const bruta = imageLinks?.thumbnail || imageLinks?.smallThumbnail || ''
  if (!bruta) return ''
  return bruta.replace(/^http:\/\//, 'https://').replace(/&edge=curl/g, '')
}
