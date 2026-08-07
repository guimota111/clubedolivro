import { useId } from 'react'
import { PALETA, normalizarCor, pareceDourada, variaveisDaCor } from '../lib/cores'

// Escolha da cor do membro: a paleta do clube em amostras clicáveis, mais um
// seletor livre para quem quiser um tom próprio. A cor pinta a barra de
// progresso na pista e na estante.
export default function SeletorCor({ valor, aoEscolher, coresUsadas, rotulo }) {
  const idCustom = useId()
  const atual = normalizarCor(valor) || ''
  const usadas = coresUsadas || new Set()
  const foraDaPaleta = atual && !PALETA.some((c) => c.hex === atual)

  return (
    <div className="campo">
      <label htmlFor={idCustom}>{rotulo || 'Sua cor na pista'}</label>

      <div className="paleta-cores" role="radiogroup" aria-label="Cores disponíveis">
        {PALETA.map((c) => {
          const ativa = atual === c.hex
          const jaUsada = !ativa && usadas.has(c.hex.toLowerCase())
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={ativa}
              aria-label={jaUsada ? `${c.nome} (já usada por outro membro)` : c.nome}
              title={jaUsada ? `${c.nome} — já usada por outro membro` : c.nome}
              className={`amostra-cor${ativa ? ' ativa' : ''}${jaUsada ? ' usada' : ''}`}
              style={{ '--cor-amostra': c.hex }}
              onClick={() => aoEscolher(c.hex)}
            />
          )
        })}
      </div>

      <div className="paleta-livre">
        <input
          id={idCustom}
          type="color"
          className="entrada-cor"
          value={atual || PALETA[0].hex}
          onChange={(e) => aoEscolher(normalizarCor(e.target.value) || PALETA[0].hex)}
        />
        <span className="texto-tenue" style={{ fontSize: '0.85rem' }}>
          Ou escolha um tom seu
          {foraDaPaleta && <> — atual: <code>{atual}</code></>}
        </span>
      </div>

      {pareceDourada(atual) && (
        <p className="aviso-cor">
          Esse tom é bem dourado — e o dourado já marca o que foi lido nas
          últimas 24 h. Uma cor diferente deixa seu avanço recente mais visível.
        </p>
      )}
    </div>
  )
}

// Amostra de como a barra fica: a cor escolhida pinta o acumulado e o dourado,
// a ponta, mostra o que foi lido nas últimas 24 h.
export function PreviaBarra({ cor }) {
  return (
    <div className="previa-barra" style={variaveisDaCor(cor)}>
      <div className="previa-trilho" aria-hidden="true">
        <div className="previa-base" style={{ width: '55%' }} />
        <div className="previa-recente" style={{ left: '55%', width: '18%' }} />
      </div>
      <p className="texto-tenue previa-legenda">
        Sua cor mostra tudo o que você já leu; o <strong>dourado</strong> na
        ponta é o que você avançou nas últimas 24 h.
      </p>
    </div>
  )
}
