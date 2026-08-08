import { useEffect, useState } from 'react'

// Leva a tela até o item apontado por um aviso de novidades e o destaca por um
// instante. Cada clique carrega uma `marca` diferente, então clicar duas vezes
// no mesmo aviso funciona de novo.
//
// O elemento alvo precisa ter id `foco-{tipo}-{id}`.

// A aba só troca de painel no render seguinte; sem essa folga o elemento ainda
// não existe quando procuramos por ele.
const ESPERA_MONTAGEM = 80
const DURACAO_DESTAQUE = 2400

export function useFoco(foco, tipo, aoPreparar) {
  const [destacado, setDestacado] = useState(null)

  useEffect(() => {
    if (!foco || foco.tipo !== tipo || !foco.id) return

    // Deixa o componente arrumar a casa primeiro (abrir a nota, por exemplo).
    aoPreparar?.(foco)
    setDestacado(foco.id)

    const rolar = setTimeout(() => {
      document
        .getElementById(`foco-${tipo}-${foco.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, ESPERA_MONTAGEM)
    const apagar = setTimeout(() => setDestacado(null), DURACAO_DESTAQUE)

    return () => {
      clearTimeout(rolar)
      clearTimeout(apagar)
    }
  }, [foco]) // eslint-disable-line react-hooks/exhaustive-deps

  return destacado
}
