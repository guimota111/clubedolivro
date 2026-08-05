// Formata um Timestamp do Firestore (ou Date) de forma amigável em pt-BR.
export function formatarData(ts) {
  if (!ts) return ''
  const data = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : null
  if (!data) return ''

  const agora = new Date()
  const diffMs = agora - data
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `há ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `há ${diffD} dia${diffD > 1 ? 's' : ''}`

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Calcula a porcentagem de leitura a partir de páginas (usado só como
// fallback para progresso antigo que ainda guardava paginaAtual).
export function calcularPct(paginaAtual, totalPaginas) {
  if (!totalPaginas || totalPaginas <= 0) return 0
  const pct = (paginaAtual / totalPaginas) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

// Garante um número inteiro de porcentagem entre 0 e 100.
export function limitarPct(valor) {
  const n = Math.round(Number(valor))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

// Extrai a porcentagem de um documento de progresso, com fallback para o
// modelo antigo (paginaAtual / totalPaginas do livro).
export function pctDoProgresso(prog, totalPaginas) {
  if (!prog) return 0
  if (typeof prog.porcentagem === 'number') return limitarPct(prog.porcentagem)
  if (typeof prog.paginaAtual === 'number') {
    return calcularPct(prog.paginaAtual, totalPaginas || 0)
  }
  return 0
}

// Converte a data-limite ('YYYY-MM-DD') no instante final daquele dia (23:59:59
// no fuso local). Retorna null se inválida/ausente.
export function prazoParaData(iso) {
  if (!iso || typeof iso !== 'string') return null
  const partes = iso.split('-').map(Number)
  if (partes.length !== 3 || partes.some((n) => !Number.isFinite(n))) return null
  const [ano, mes, dia] = partes
  const d = new Date(ano, mes - 1, dia, 23, 59, 59, 999)
  return Number.isNaN(d.getTime()) ? null : d
}

// Quebra a diferença até `alvo` (Date) em dias/horas/min/seg e diz se venceu.
export function contagemRegressiva(alvo, agora = new Date()) {
  if (!alvo) return null
  let ms = alvo.getTime() - agora.getTime()
  const vencido = ms <= 0
  if (vencido) ms = 0
  const dias = Math.floor(ms / 86400000)
  const horas = Math.floor((ms % 86400000) / 3600000)
  const minutos = Math.floor((ms % 3600000) / 60000)
  const segundos = Math.floor((ms % 60000) / 1000)
  return { dias, horas, minutos, segundos, vencido }
}

// Primeira letra do nome para avatares vazios.
export function inicial(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}
