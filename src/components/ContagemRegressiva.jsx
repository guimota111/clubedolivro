import { useEffect, useState } from 'react'
import { prazoParaData, contagemRegressiva } from '../lib/formato'

// Contador regressivo até a data-limite de término do livro.
// Atualiza a cada segundo. Não renderiza nada se o livro não tem prazo.
export default function ContagemRegressiva({ dataLimite }) {
  const alvo = prazoParaData(dataLimite)
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    if (!alvo) return
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [dataLimite]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!alvo) return null

  const c = contagemRegressiva(alvo, agora)
  const dataFmt = alvo.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  if (c.vencido) {
    return (
      <div className="contador contador-vencido" role="status">
        <span className="contador-titulo">Prazo encerrado</span>
        <span className="contador-sub">A data-limite ({dataFmt}) já passou.</span>
      </div>
    )
  }

  const unidades = [
    { valor: c.dias, rotulo: c.dias === 1 ? 'dia' : 'dias' },
    { valor: c.horas, rotulo: 'h' },
    { valor: c.minutos, rotulo: 'min' },
    { valor: c.segundos, rotulo: 'seg' },
  ]

  return (
    <div className="contador" role="status" aria-label={`Faltam ${c.dias} dias para o prazo`}>
      <span className="contador-titulo">Para terminar a leitura</span>
      <div className="contador-relogio">
        {unidades.map((u, i) => (
          <div className="contador-bloco" key={i}>
            <span className="contador-num">{String(u.valor).padStart(2, '0')}</span>
            <span className="contador-rot">{u.rotulo}</span>
          </div>
        ))}
      </div>
      <span className="contador-sub">até {dataFmt}</span>
    </div>
  )
}
