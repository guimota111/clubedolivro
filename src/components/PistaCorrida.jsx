import { useMemo } from 'react'
import { pctDoProgresso, inicial } from '../lib/formato'
import { fraseReacao } from '../lib/reacoes'
import { corDoMembro, variaveisDaCor } from '../lib/cores'
import { faixasDeProgresso } from '../lib/progresso24h'
import { IconeCoroa } from './Icones'
import { useVerFoto } from './FotoContext'

// Pista de corrida — layout principal em telas largas (o CSS esconde no mobile,
// onde a Estante vertical aparece no lugar). Cada membro corre em uma raia e
// seu retrato fica na posição da sua %. Líder(es) recebem a coroa. No hover,
// um cartão mostra nome, página (se houver) e porcentagem.
//
// A raia é pintada na cor escolhida pelo membro; só o trecho conquistado nas
// últimas 24 h fica dourado, para saltar aos olhos quem devorou o livro ontem.
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
    const agora = Date.now()
    return membros
      .map((m) => {
        const prog = porUsuario[m.id]
        const pct = pctDoProgresso(prog, total)
        const pagina =
          prog && typeof prog.paginaAtual === 'number' ? prog.paginaAtual : null
        const totalPag =
          prog && typeof prog.totalPaginas === 'number' ? prog.totalPaginas : null
        const faixas = faixasDeProgresso(prog, pct, agora)
        return { membro: m, pct, pagina, totalPag, faixas, cor: corDoMembro(m) }
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
    <>
    <div className="pista" aria-label="Pista de corrida da leitura">
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
              style={variaveisDaCor(c.cor)}
            >
              {/* Ficha da raia: no celular não há hover, então nome e % ficam
                  sempre à vista, acima do trilho. O CSS esconde no desktop,
                  onde essa informação vem no cartão de hover. */}
              <div className="raia-info" aria-hidden="true">
                <span className="raia-nome">{c.membro.nome}</span>
                <span className="raia-numeros">
                  {c.faixas.recente > 0 && (
                    <span className="raia-ganho">+{c.faixas.recente}%</span>
                  )}
                  <span className="raia-pct">{c.pct}%</span>
                </span>
              </div>

              <div className="raia-pista">
                <div className="raia-trilho" aria-hidden="true">
                  <div className="raia-preenchida" style={{ width: `${c.faixas.base}%` }} />
                  {c.faixas.recente > 0 && (
                    <div
                      className="raia-recente"
                      style={{
                        left: `${c.faixas.base}%`,
                        width: `${c.faixas.recente}%`,
                      }}
                    />
                  )}
                </div>
                {(notasPorUsuario[c.membro.id] || []).map((n) => {
                  const frase = fraseReacao(n.emoji)
                  const nome = c.membro.nome || 'Membro'
                  const pct = n.desbloqueioPct || 0
                  const titulo = frase
                    ? `Nota de ${nome} ${frase} em ${pct}%`
                    : `Nota de ${nome} em ${pct}%`
                  return (
                    <span
                      key={n.id}
                      className="raia-nota"
                      style={{ left: `${pct}%` }}
                      title={titulo}
                      aria-hidden="true"
                    >
                      {n.emoji}
                    </span>
                  )
                })}
                <div
                  className="corredor"
                  style={{ left: `${c.pct}%` }}
                  tabIndex={0}
                  aria-label={
                    c.faixas.recente > 0
                      ? `${c.membro.nome}: ${c.pct}% lido, sendo ${c.faixas.recente}% nas últimas 24 horas`
                      : `${c.membro.nome}: ${c.pct}% lido`
                  }
                >
                  {lider && (
                    <IconeCoroa size={22} className="corredor-coroa" aria-hidden="true" />
                  )}
                  {/* Ganho das 24 h sempre à vista: a faixa dourada dele fica
                      logo atrás do retrato, então um avanço pequeno some.
                      No celular quem mostra isso é a ficha da raia. */}
                  {c.faixas.recente > 0 && (
                    <span className="corredor-ganho" aria-hidden="true">
                      +{c.faixas.recente}%
                    </span>
                  )}
                  <CorredorAvatar membro={c.membro} />
                  <div className="corredor-tooltip" role="tooltip">
                    <strong>{c.membro.nome}</strong>
                    <span>{c.pct}% lido</span>
                    <span className="corredor-tooltip-pag">{paginaTxt}</span>
                    {c.faixas.recente > 0 && (
                      <span className="corredor-tooltip-recente">
                        +{c.faixas.recente}% nas últimas 24 h
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
    <LegendaCores />
    </>
  )
}

// Explica o código de cores da pista (vale também para a estante no celular).
export function LegendaCores() {
  return (
    <p className="legenda-cores">
      <span className="legenda-item">
        <i className="legenda-amostra legenda-amostra-membro" aria-hidden="true" />
        Progresso acumulado, na cor de cada leitor
      </span>
      <span className="legenda-item">
        <i className="legenda-amostra legenda-amostra-dourada" aria-hidden="true" />
        Lido nas últimas 24 h
      </span>
    </p>
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
