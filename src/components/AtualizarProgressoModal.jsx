import { useState } from 'react'
import Modal from './Modal'
import { salvarProgresso } from '../lib/db'
import { calcularPct } from '../lib/formato'
import { IconeMarcador } from './Icones'

// Modal para o membro informar sua página atual.
export default function AtualizarProgressoModal({
  userId,
  livro,
  paginaAtualInicial,
  onFechar,
}) {
  const [pagina, setPagina] = useState(
    paginaAtualInicial ? String(paginaAtualInicial) : ''
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const total = livro?.totalPaginas || 0
  const paginaNum = parseInt(pagina, 10)
  const pctPrevia = Number.isFinite(paginaNum) ? calcularPct(paginaNum, total) : 0

  async function aoEnviar(e) {
    e.preventDefault()
    const p = parseInt(pagina, 10)
    if (!Number.isFinite(p) || p < 0) {
      setErro('Informe um número de página válido.')
      return
    }
    if (total && p > total) {
      setErro(`O livro tem ${total} páginas. Informe até esse valor.`)
      return
    }
    setSalvando(true)
    setErro('')
    try {
      await salvarProgresso(userId, livro.id, p)
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
        Lendo <strong>{livro?.titulo}</strong> — {total} páginas.
      </p>
      <form onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="pagina">Estou na página</label>
          <input
            id="pagina"
            type="number"
            min="0"
            max={total || undefined}
            value={pagina}
            onChange={(e) => setPagina(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </div>

        <div
          className="selo-secao"
          style={{ justifyContent: 'center', fontSize: '1.3rem', margin: '0.4rem 0 1rem' }}
        >
          <IconeMarcador size={20} />
          <span style={{ fontFamily: 'var(--fonte-titulo)', color: 'var(--dourado-claro)' }}>
            {pctPrevia}% do livro
          </span>
        </div>

        {erro && <div className="erro">{erro}</div>}

        <button className="btn" type="submit" disabled={salvando} style={{ width: '100%' }}>
          {salvando ? 'Salvando…' : 'Atualizar posição na estante'}
        </button>
      </form>
    </Modal>
  )
}
