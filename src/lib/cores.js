// Cores dos membros — cada leitor escolhe a cor da sua barra de progresso.
//
// Regra visual do clube: a cor do membro pinta TODO o progresso acumulado; só
// o que ele avançou nas últimas 24 h aparece em DOURADO. Por isso a paleta
// evita de propósito a faixa dourada/âmbar — se a cor do leitor fosse dourada,
// o destaque das 24 h desapareceria.

export const PALETA = [
  { id: 'rubi', nome: 'Rubi', hex: '#d1403a' },
  { id: 'coral', nome: 'Coral', hex: '#e0714f' },
  { id: 'vinho', nome: 'Vinho', hex: '#a03555' },
  { id: 'rosa', nome: 'Rosa', hex: '#dd5f9c' },
  { id: 'orquidea', nome: 'Orquídea', hex: '#b95fcc' },
  { id: 'violeta', nome: 'Violeta', hex: '#8a63d8' },
  { id: 'anil', nome: 'Anil', hex: '#5570d4' },
  { id: 'ceu', nome: 'Céu', hex: '#3f92d2' },
  { id: 'turquesa', nome: 'Turquesa', hex: '#2aa6a6' },
  { id: 'esmeralda', nome: 'Esmeralda', hex: '#35a06b' },
  { id: 'musgo', nome: 'Musgo', hex: '#8aa63c' },
  { id: 'perola', nome: 'Pérola', hex: '#b9c2cc' },
]

// Dourado reservado ao avanço das últimas 24 h (espelha as vars do tema).
export const DOURADO = '#c9a227'
export const DOURADO_BRILHO = '#f4d97b'

// ---------- Utilidades de cor ----------

function hexParaRgb(hex) {
  const limpo = String(hex || '').trim().replace(/^#/, '')
  const cheio =
    limpo.length === 3
      ? limpo
          .split('')
          .map((c) => c + c)
          .join('')
      : limpo
  if (!/^[0-9a-fA-F]{6}$/.test(cheio)) return null
  return {
    r: parseInt(cheio.slice(0, 2), 16),
    g: parseInt(cheio.slice(2, 4), 16),
    b: parseInt(cheio.slice(4, 6), 16),
  }
}

function rgbParaHex({ r, g, b }) {
  const parte = (n) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${parte(r)}${parte(g)}${parte(b)}`
}

// Aceita '#rrggbb', 'rrggbb', '#rgb' ou o id de uma cor da paleta.
// Devolve sempre '#rrggbb' em minúsculas — ou null se não reconhecer.
export function normalizarCor(valor) {
  if (!valor || typeof valor !== 'string') return null
  const daPaleta = PALETA.find((c) => c.id === valor.trim().toLowerCase())
  if (daPaleta) return daPaleta.hex
  const rgb = hexParaRgb(valor)
  return rgb ? rgbParaHex(rgb) : null
}

function misturar(hex, alvo, peso) {
  const a = hexParaRgb(hex)
  const b = hexParaRgb(alvo)
  if (!a || !b) return hex
  return rgbParaHex({
    r: a.r + (b.r - a.r) * peso,
    g: a.g + (b.g - a.g) * peso,
    b: a.b + (b.b - a.b) * peso,
  })
}

export function clarear(hex, peso = 0.3) {
  return misturar(hex, '#ffffff', peso)
}

export function escurecer(hex, peso = 0.3) {
  return misturar(hex, '#000000', peso)
}

export function comAlfa(hex, alfa = 0.4) {
  const rgb = hexParaRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alfa})`
}

// Avisa quando a cor escolhida é dourada demais: nesse caso ela se confunde
// com o destaque das últimas 24 h.
export function pareceDourada(hex) {
  const rgb = hexParaRgb(hex)
  if (!rgb) return false
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta < 0.08) return false // cinza: não confunde
  let matiz
  if (max === r) matiz = 60 * (((g - b) / delta + 6) % 6)
  else if (max === g) matiz = 60 * ((b - r) / delta + 2)
  else matiz = 60 * ((r - g) / delta + 4)
  const luz = (max + min) / 2
  const sat = delta / (1 - Math.abs(2 * luz - 1) || 1)
  return matiz >= 35 && matiz <= 62 && sat > 0.3 && luz > 0.25
}

// Hash estável de uma string: mesmo texto -> mesmo número, em qualquer
// navegador. É o que faz o sorteio de cor ser "aleatório" mas reproduzível.
export function hashTexto(txt) {
  let h = 2166136261
  const s = String(txt || '')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h | 0)
}

// ---------- Cor de um membro ----------

// Cor do membro: a que ele escolheu ou, enquanto não escolher, uma da paleta
// sorteada a partir do id (estável — não muda a cada recarregamento).
export function corDoMembro(membro) {
  return (
    normalizarCor(membro?.cor) ||
    PALETA[hashTexto(membro?.id || '') % PALETA.length].hex
  )
}

// Cores já escolhidas pelos outros membros (para marcar as repetidas na
// hora de escolher). Sempre em minúsculas, para comparar sem susto.
export function coresEmUso(membros, exceto) {
  const usadas = new Set()
  ;(membros || []).forEach((m) => {
    if (exceto && m.id === exceto) return
    const c = normalizarCor(m.cor)
    if (c) usadas.add(c.toLowerCase())
  })
  return usadas
}

// Sugere uma cor livre para quem está entrando agora (evita repetir as que já
// estão na pista; se a paleta lotar, volta a permitir repetição).
export function sortearCorLivre(membros, semente = '') {
  const usadas = coresEmUso(membros)
  const livres = PALETA.filter((c) => !usadas.has(c.hex.toLowerCase()))
  const opcoes = livres.length ? livres : PALETA
  return opcoes[hashTexto(semente) % opcoes.length].hex
}

// Distribui cores para os membros que ainda não têm nenhuma (o caso de quem
// já estava no clube antes desta funcionalidade). O sorteio é determinístico:
// todos os navegadores chegam ao MESMO resultado, então dois membros abrindo
// o site ao mesmo tempo não brigam pela escrita.
export function sortearCoresFaltantes(membros) {
  const usadas = coresEmUso(membros)
  const semCor = (membros || [])
    .filter((m) => m?.id && !normalizarCor(m.cor))
    .sort((a, b) => a.id.localeCompare(b.id))

  return semCor.map((m) => {
    const livres = PALETA.filter((c) => !usadas.has(c.hex.toLowerCase()))
    const opcoes = livres.length ? livres : PALETA
    const cor = opcoes[hashTexto(m.id) % opcoes.length].hex
    usadas.add(cor.toLowerCase())
    return { id: m.id, cor }
  })
}

// Variáveis CSS derivadas da cor, aplicadas inline nos componentes de barra.
export function variaveisDaCor(hex) {
  const cor = normalizarCor(hex) || PALETA[0].hex
  return {
    '--cor-membro': cor,
    '--cor-membro-clara': clarear(cor, 0.32),
    '--cor-membro-escura': escurecer(cor, 0.35),
    '--cor-membro-tenue': comAlfa(cor, 0.35),
    '--cor-membro-brilho': comAlfa(clarear(cor, 0.35), 0.55),
  }
}
