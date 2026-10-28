import { useEffect, useRef } from 'react'

// Chuva de confete em dourado, papel e bordô, desenhada num canvas que cobre
// a tela por alguns segundos e some sozinho. Enfeite puro: não captura
// toques (pointer-events: none) e respeita quem pediu menos movimento.
export default function Confete({ duracao = 5000, quantidade = 180 }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const cores = ['#c9a227', '#e0b94d', '#f4d97b', '#f0e6d2', '#7a2a2a', '#d9cbb0']
    let largura = (canvas.width = window.innerWidth)
    let altura = (canvas.height = window.innerHeight)
    function redimensionar() {
      largura = canvas.width = window.innerWidth
      altura = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', redimensionar)

    const particulas = Array.from({ length: quantidade }, () => ({
      x: Math.random() * largura,
      y: -20 - Math.random() * altura * 0.6,
      w: 6 + Math.random() * 8,
      h: 4 + Math.random() * 6,
      cor: cores[Math.floor(Math.random() * cores.length)],
      vy: 2 + Math.random() * 3,
      vx: -1 + Math.random() * 2,
      angulo: Math.random() * Math.PI * 2,
      giro: -0.15 + Math.random() * 0.3,
      balanco: Math.random() * Math.PI * 2,
    }))

    const inicio = performance.now()
    let quadro = 0
    function desenhar(agora) {
      const decorrido = agora - inicio
      ctx.clearRect(0, 0, largura, altura)
      // Nos últimos instantes, esmaece em vez de sumir de uma vez.
      ctx.globalAlpha = Math.max(0, Math.min(1, (duracao - decorrido) / 800))
      particulas.forEach((p) => {
        p.balanco += 0.05
        p.x += p.vx + Math.sin(p.balanco) * 0.8
        p.y += p.vy
        p.angulo += p.giro
        if (p.y > altura + 20) {
          p.y = -20
          p.x = Math.random() * largura
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angulo)
        ctx.fillStyle = p.cor
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })
      ctx.globalAlpha = 1
      if (decorrido < duracao) quadro = requestAnimationFrame(desenhar)
      else ctx.clearRect(0, 0, largura, altura)
    }
    quadro = requestAnimationFrame(desenhar)

    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('resize', redimensionar)
    }
  }, [duracao, quantidade])

  return <canvas ref={ref} className="confete" aria-hidden="true" />
}
