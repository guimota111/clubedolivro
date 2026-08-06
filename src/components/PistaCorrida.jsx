import { useMemo } from 'react'
import { pctDoProgresso, inicial } from '../lib/formato'
import { IconeCoroa } from './Icones'
import { useVerFoto } from './FotoContext'

// Pista de corrida — layout principal em telas largas (o CSS esconde no mobile,
// onde a Estante vertical aparece no lugar). Cada membro corre em uma raia e
// seu retrato fica na posição da sua %. Líder(es) recebem a coroa. No hover,
// um cartão mostra nome, página (se houver) e porcentagem.
export default function PistaCorrida({ membros, porUsuario, livro, notas = [], meuUserId }) {
  // Agrupa as notas por autor para pintar os emojis na trilha de cada um,
  // na posição da % de desbloqueio (a reação é visível para todos).
  const notasPorUsuario = useMemo(() => {
    const mapa = {}
    notas.forEach((n) => {
      if (!n.emoji) return
      ;(mapa[n.userId] = mapa[n.userId] || []).push(n)
    })
    return mapa
  }, [notas])

  const corredores = useMemo(() => {
    const total = livro?.totalPaginas || 0
    return membros
      .map((m) => {
        const prog = porUsuario[m.id]
        const pct = pctDoProgresso(prog, total)
        const pagina =
          prog && typeof prog.paginaAtual === 'number' ? prog.paginaAtual : null
        const totalPag =
          prog && typeof prog.totalPaginas === 'number' ? prog.totalPaginas : null
        return { membro: m, pct, pagina, totalPag }
      })
      .sort((a, b) => {
        if (b.pct !== a.pct) return b.pct - a.pct
        return (a.membro.nome || '').localeCompare(b.membro.nome || '')
      })
  }, [membros, porUsuario, livro])

  if (!membros.length) {
    return (
      <p className="estante-vazia">
        A pista ainda está vazia. Seja o primeiro a largar!
      </p>
    )
  }

  const maiorPct = Math.max(...corredores.map((c) => c.pct))
  const temLider = maiorPct > 0

  return (
    <div className="pista" role="img" aria-label="Pista de corrida da leitura">
      <div className="pista-marcadores" aria-hidden="true">
        <span>Largada</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span className="pista-chegada">Chegada</span>
      </div>

      <div className="pista-raias">
        {corredores.map((c) => {
          const lider = temLider && c.pct === maiorPct
          const souEu = c.membro.id === meuUserId
          const paginaTxt =
            c.pagina != null
              ? c.totalPag != null
                ? `página ${c.pagina}/${c.totalPag}`
                : `página ${c.pagina}`
              : 'progresso por %'
          return (
            <div
              className={`raia${lider ? ' raia-lider' : ''}${souEu ? ' raia-eu' : ''}`}
              key={c.membro.id}
            >
              <div className="raia-trilho" aria-hidden="true">
                <div className="raia-preenchida" style={{ width: `${c.pct}%` }} />
              </div>
              {(notasPorUsuario[c.membro.id] || []).map((n) => (
                <span
                  key={n.id}
                  className="raia-nota"
                  style={{ left: `${n.desbloqueioPct || 0}%` }}
                  title={`Nota em ${n.desbloqueioPct || 0}%`}
                  aria-hidden="true"
                >
                  {n.emoji}
                </span>
              ))}
              <div
                className="corredor"
                style={{ left: `${c.pct}%` }}
                tabIndex={0}
              >
                {lider && (
                  <IconeCoroa size={22} className="corredor-coroa" aria-hidden="true" />
                )}
                <CorredorAvatar membro={c.membro} />
                <div className="corredor-tooltip" role="tooltip">
                  <strong>{c.membro.nome}</strong>
                  <span>{c.pct}% lido</span>
                  <span className="corredor-tooltip-pag">{paginaTxt}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CorredorAvatar({ membro }) {
  const verFoto = useVerFoto()
  if (membro.avatarUrl) {
    return (
      <img
        className="corredor-avatar avatar-clicavel"
        src={membro.avatarUrl}
        alt={membro.nome}
        onClick={() => verFoto(membro.avatarUrl, membro.nome)}
      />
    )
  }
  return <span className="corredor-avatar corredor-inicial">{inicial(membro.nome)}</span>
}
