// As rotas do site, guardadas no `#hash` da barra de endereço.
//
// O site é uma página só, mas tem várias telas — e um menu que leva a cada
// uma. Guardar a tela no hash dá o que o membro espera de um site: o botão
// voltar do celular desfaz o último passo, recarregar a página volta para
// onde ele estava, e um link para "#/patos/abc" abre direto no perfil certo.
// Não é um roteador de verdade: é um par de funções que lê e escreve
// `{ pagina, id, sub }`.
//
//   #/atual/corrida            a leitura de agora, na sub-aba da corrida
//   #/anteriores/<livroId>/notas  um livro encerrado, nas notas dele
//   #/lidos/<livroId>          as resenhas de um livro já lido
//   #/patos/<userId>           o perfil de um leitor
//   #/mural  #/proximo  #/eleicao  #/novidades

export const PAGINAS = [
  'atual',
  'anteriores',
  'lidos',
  'patos',
  'mural',
  'proximo',
  'eleicao',
  'novidades',
]

// As sub-abas de um livro: a corrida (com o relógio do ciclo), as notas
// parciais e as resenhas. Valem para o livro atual e para os anteriores.
export const SUBS_DO_LIVRO = ['corrida', 'notas', 'resenhas']

export const ROTA_INICIAL = { pagina: 'atual', id: '', sub: 'corrida' }

// Páginas em que o segundo pedaço da rota é um id (de livro ou de leitor).
const COM_ID = new Set(['anteriores', 'lidos', 'patos'])

export function lerRota(hash = '') {
  const partes = String(hash)
    .replace(/^#\/?/, '')
    .split('/')
    .map((p) => decodeURIComponent(p.trim()))
    .filter(Boolean)

  const pagina = PAGINAS.includes(partes[0]) ? partes[0] : ROTA_INICIAL.pagina
  let id = ''
  let sub = ''
  if (COM_ID.has(pagina)) {
    id = partes[1] || ''
    sub = partes[2] || ''
  } else {
    sub = partes[1] || ''
  }
  // Sub-aba só existe nas páginas de livro; fora delas é ruído.
  if (pagina === 'atual' || pagina === 'anteriores') {
    if (!SUBS_DO_LIVRO.includes(sub)) sub = 'corrida'
  } else {
    sub = ''
  }
  return { pagina, id, sub }
}

export function escreverRota({ pagina = 'atual', id = '', sub = '' } = {}) {
  const partes = [pagina]
  if (COM_ID.has(pagina) && id) partes.push(encodeURIComponent(id))
  if (sub) partes.push(sub)
  return `#/${partes.join('/')}`
}

export function mesmaRota(a, b) {
  return a.pagina === b.pagina && (a.id || '') === (b.id || '') && (a.sub || '') === (b.sub || '')
}
