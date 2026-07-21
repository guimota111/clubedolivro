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

// Calcula a porcentagem de leitura, limitada entre 0 e 100.
export function calcularPct(paginaAtual, totalPaginas) {
  if (!totalPaginas || totalPaginas <= 0) return 0
  const pct = (paginaAtual / totalPaginas) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

// Primeira letra do nome para avatares vazios.
export function inicial(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase() || '?'
}
