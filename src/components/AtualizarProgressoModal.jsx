import { useState } from 'react'
import Modal from './Modal'
import { salvarProgresso } from '../lib/db'
import { limitarPct } from '../lib/formato'
import { IconeMarcador } from './Icones'

// Modal para o membro informar em que porcentagem da leitura está.
// Usamos % (e não página) porque cada um pode ter uma edição diferente.
export default function AtualizarProgressoModal({
  userId,
  livro,
  porcentagemInicial,
  onFechar,
}) {
  const [pct, setPct] = useState(limitarPct(porcentagemInicial || 0))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function aoEnviar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await salvarProgresso(userId, livro.id, limitarPct(pct))
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível salvar. Tente novamente.')
      setSalvando(false)
    }
  }

  return (
    <Modal titulo="Meu progresso" onFechar={onFechar}>
      <p className="texto-suave" style={{ marginTop: 0 }}>
        Lendo <strong>{livro?.titulo}</strong>. Informe quanto você já leu —
        assim funciona para qualquer edição.
      </p>

      <form onSubmit={aoEnviar}>
        <div
          className="pct-grande"
          style={{ margin: '0.6rem 0 0.2rem' }}
          aria-hidden="true"
        >
          {limitarPct(pct)}
          <span className="pct-simbolo">%</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="slider-pct"
          aria-label="Porcentagem lida"
          style={{ '--pct': `${limitarPct(pct)}%` }}
        />

        <div className="campo" style={{ marginTop: '1rem' }}>
          <label htmlFor="pct-num">Ou digite a porcentagem exata</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              id="pct-num"
              type="number"
              min="0"
              max="100"
              value={pct}
              onChange={(e) => setPct(e.target.value === '' ? 0 : Number(e.target.value))}
              style={{ maxWidth: 120 }}
            />
            <span className="texto-suave" style={{ fontSize: '1.2rem' }}>
              %
            </span>
          </div>
        </div>

        {erro && <div className="erro">{erro}</div>}

        <button className="btn" type="submit" disabled={salvando} style={{ width: '100%' }}>
          <IconeMarcador size={18} />
          {salvando ? 'Salvando…' : 'Atualizar posição na estante'}
        </button>
      </form>
    </Modal>
  )
}
