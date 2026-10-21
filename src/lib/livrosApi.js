// Busca de livros, para a indicação não exigir que ninguém digite autor e
// número de páginas na mão (mas tudo pode ser corrigido depois).
//
// Duas fontes, em ordem:
//
//   1. Google Books — melhor catálogo de edições brasileiras. A API exige uma
//      chave: sem ela a Google recusa a consulta com "cota zero". Vale a
//      chave web do próprio projeto Firebase (`firebaseConfig.apiKey`), desde
//      que a "Books API" esteja ativada no projeto e liberada nas restrições
//      da chave (Google Cloud → APIs e serviços → Credenciais). Ou cole aqui
//      uma chave de outro projeto que já tenha a Books API ativa.
//   2. Open Library — não precisa de chave. Entra quando a Google falha ou não
//      acha nada. O catálogo em português é mais ralo e às vezes a capa é de
//      outra edição, mas dá para corrigir no formulário.
import { firebaseConfig } from '../firebase'

const CHAVE_GOOGLE_BOOKS = ''
const chaveGoogle = () => CHAVE_GOOGLE_BOOKS || firebaseConfig.apiKey || ''

const GOOGLE = 'https://www.googleapis.com/books/v1/volumes'
const CAMPOS_GOOGLE =
  'items(id,volumeInfo(title,subtitle,authors,pageCount,language,imageLinks,publishedDate,publisher,industryIdentifiers))'
const OPEN_LIBRARY = 'https://openlibrary.org/search.json'
const CAPA_OPEN_LIBRARY = 'https://covers.openlibrary.org/b/id'
const POR_BUSCA = 12

// Parece um ISBN? Dez ou treze dígitos (o décimo pode ser X), com ou sem
// hífens. Aí a busca é exata, em vez de procurar os números no título.
export function pareceIsbn(texto) {
  const limpo = (texto || '').replace(/[-\s]/g, '')
  return /^(\d{9}[\dXx]|\d{13})$/.test(limpo) ? limpo : ''
}

// Devolve uma lista de candidatos já no formato que a indicação usa:
//   { fonteId, fonte, titulo, autor, totalPaginas, capaUrl, idioma, ano, editora }
//
// Lança só quando NENHUMA fonte respondeu; lista vazia quer dizer que as
// fontes responderam e não acharam.
export async function buscarLivros(termo) {
  const limpo = (termo || '').trim()
  if (!limpo) return []
  const isbn = pareceIsbn(limpo)

  let erroGoogle = null
  try {
    const daGoogle = await buscarNaGoogle(limpo, isbn)
    if (daGoogle.length) return daGoogle
  } catch (err) {
    erroGoogle = err
    console.warn('Google Books não respondeu; tentando a Open Library.', err)
  }

  try {
    return await buscarNaOpenLibrary(limpo, isbn)
  } catch (err) {
    console.error('Open Library não respondeu.', err)
    throw erroGoogle || err
  }
}

// ---------- Google Books ----------

// Duas consultas ao mesmo tempo — só edições em português e sem filtro de
// idioma — juntas com as em português na frente: o clube lê em português,
// mas uma edição estrangeira ainda serve para puxar capa e páginas quando a
// brasileira não está catalogada.
async function buscarNaGoogle(termo, isbn) {
  const q = isbn ? `isbn:${isbn}` : termo
  const respostas = await Promise.allSettled([
    consultarGoogle(q, { langRestrict: 'pt' }),
    consultarGoogle(q, {}),
  ])
  const falhas = respostas.filter((r) => r.status === 'rejected')
  if (falhas.length === respostas.length) throw falhas[0].reason
  return juntar(respostas.filter((r) => r.status === 'fulfilled').map((r) => r.value))
}

async function consultarGoogle(q, extras) {
  const params = new URLSearchParams({
    q,
    maxResults: String(POR_BUSCA),
    printType: 'books',
    fields: CAMPOS_GOOGLE,
    ...extras,
  })
  const chave = chaveGoogle()
  if (chave) params.set('key', chave)
  const resposta = await fetch(`${GOOGLE}?${params}`)
  if (!resposta.ok) throw new Error(`Google Books respondeu ${resposta.status}`)
  const corpo = await resposta.json()
  return (corpo.items || []).map(converterGoogle)
}

function converterGoogle(item) {
  const v = item?.volumeInfo || {}
  return {
    fonteId: item.id,
    fonte: 'Google Books',
    titulo: [v.title, v.subtitle].filter(Boolean).join(': '),
    autor: Array.isArray(v.authors) ? v.authors.join(', ') : '',
    totalPaginas: paginas(v.pageCount),
    capaUrl: capaDaGoogle(v.imageLinks),
    idioma: v.language || '',
    ano: (v.publishedDate || '').slice(0, 4),
    editora: v.publisher || '',
  }
}

// A miniatura vem em http e com uma "orelha" dobrada desenhada por cima
// (`edge=curl`). Troca para https — o site é https e o navegador bloquearia a
// imagem — e tira a orelha.
function capaDaGoogle(imageLinks) {
  const bruta = imageLinks?.thumbnail || imageLinks?.smallThumbnail || ''
  if (!bruta) return ''
  return bruta.replace(/^http:\/\//, 'https://').replace(/&edge=curl/g, '')
}

// ---------- Open Library ----------

async function buscarNaOpenLibrary(termo, isbn) {
  const params = new URLSearchParams({
    q: isbn ? `isbn:${isbn}` : termo,
    fields: 'key,title,author_name,number_of_pages_median,cover_i,first_publish_year,publisher,language',
    limit: String(POR_BUSCA),
    // Pede que a edição representativa de cada obra seja a em português,
    // quando existir — é dela que saem capa e número de páginas.
    lang: 'pt',
  })
  const resposta = await fetch(`${OPEN_LIBRARY}?${params}`)
  if (!resposta.ok) throw new Error(`Open Library respondeu ${resposta.status}`)
  const corpo = await resposta.json()
  const lista = (corpo.docs || []).map(converterOpenLibrary)
  // Obras com edição em português primeiro, como na Google.
  const emPortugues = lista.filter((l) => l.idioma === 'pt')
  const demais = lista.filter((l) => l.idioma !== 'pt')
  return juntar([emPortugues, demais])
}

function converterOpenLibrary(doc) {
  const idiomas = Array.isArray(doc.language) ? doc.language : []
  return {
    fonteId: `ol:${doc.key}`,
    fonte: 'Open Library',
    titulo: doc.title || '',
    autor: Array.isArray(doc.author_name) ? doc.author_name.slice(0, 3).join(', ') : '',
    totalPaginas: paginas(doc.number_of_pages_median),
    capaUrl: doc.cover_i ? `${CAPA_OPEN_LIBRARY}/${doc.cover_i}-L.jpg` : '',
    idioma: idiomas.includes('por') ? 'pt' : idiomas[0] ? idiomas[0].slice(0, 2) : '',
    ano: doc.first_publish_year ? String(doc.first_publish_year) : '',
    editora: Array.isArray(doc.publisher) ? doc.publisher[0] || '' : '',
  }
}

// ---------- Utilidades ----------

function paginas(valor) {
  const n = Math.round(Number(valor))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Junta listas na ordem dada, sem repetir o mesmo livro e sem itens sem título.
function juntar(listas) {
  const vistos = new Set()
  const resultado = []
  listas.flat().forEach((item) => {
    if (!item || !item.titulo || vistos.has(item.fonteId)) return
    vistos.add(item.fonteId)
    resultado.push(item)
  })
  return resultado
}
