import { useMemo } from 'react'
import MembroLivro from './MembroLivro'
import { pctDoProgresso } from '../lib/formato'

// A Estante: cada membro vira um livro que se enche conforme sua % de leitura.
// Ordenada do mais avançado ao menos avançado, em tempo real.
export default function Estante({ membros, porUsuario, livro, meuUserId }) {
  const ordenados = useMemo(() => {
    const total = livro?.totalPaginas || 0
    return membros
      .map((m) => ({
        membro: m,
        pct: pctDoProgresso(porUsuario[m.id], total),
      }))
      .sort((a, b) => {
        // Mais avançado primeiro; empate desempata por nome.
        if (b.pct !== a.pct) return b.pct - a.pct
        return (a.membro.nome || '').localeCompare(b.membro.nome || '')
      })
  }, [membros, porUsuario, livro])

  if (!membros.length) {
    return (
      <p className="estante-vazia">
        A estante ainda está vazia. Seja o primeiro a ocupar um lugar!
      </p>
    )
  }

  // O líder só recebe destaque se realmente tiver avançado algo.
  const topo = ordenados[0]
  const temLider = topo && topo.pct > 0

  return (
    <div className="estante">
      <div className="prateleira">
        {ordenados.map((item, i) => (
          <MembroLivro
            key={item.membro.id}
            membro={item.membro}
            pct={item.pct}
            lider={temLider && i === 0}
            souEu={item.membro.id === meuUserId}
          />
        ))}
      </div>
    </div>
  )
}
