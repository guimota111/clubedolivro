import { useState } from 'react'
import { publicarRecado } from '../lib/db'
import { formatarData, inicial } from '../lib/formato'
import { IconePena, DivisoriaOrnamentada } from './Icones'

// Mural de recados: post-its que qualquer membro pode deixar.
export default function Mural({ recados, membrosPorId, userId }) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function aoEnviar(e) {
    e.preventDefault()
    const limpo = texto.trim()
    if (!limpo) return
    setEnviando(true)
    setErro('')
    try {
      await publicarRecado(userId, limpo.slice(0, 999))
      setTexto('')
    } catch (err) {
      console.error(err)
      setErro('Não foi possível publicar o recado.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="painel">
      <h2 className="secao-titulo">
        <IconePena size={22} /> Mural de Recados
      </h2>
      <DivisoriaOrnamentada
        style={{ width: '55%', height: 14, margin: '0 auto 1rem', color: 'var(--dourado)', opacity: 0.7 }}
      />

      <form className="mural-form" onSubmit={aoEnviar}>
        <div className="campo" style={{ marginBottom: '0.6rem' }}>
          <label htmlFor="recado">Deixe um recado (sem spoilers!)</label>
          <textarea
            id="recado"
            value={texto}
            maxLength={999}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Que capítulo, hein…"
          />
        </div>
        {erro && <div className="erro">{erro}</div>}
        <button
          className="btn"
          type="submit"
          disabled={enviando || !texto.trim()}
        >
          <IconePena size={16} />
          {enviando ? 'Publicando…' : 'Publicar recado'}
        </button>
      </form>

      {recados.length === 0 ? (
        <p className="mural-vazio">Nenhum recado ainda. Comece a conversa!</p>
      ) : (
        <div className="mural-lista">
          {recados.map((r) => {
            const autor = membrosPorId[r.userId]
            return (
              <article className="recado" key={r.id}>
                <div className="texto">{r.texto}</div>
                <div className="assinatura">
                  {autor?.avatarUrl ? (
                    <img src={autor.avatarUrl} alt="" />
                  ) : (
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#c9a227',
                        color: '#2b1d13',
                        fontFamily: 'var(--fonte-titulo)',
                        fontSize: '0.85rem',
                      }}
                    >
                      {inicial(autor?.nome)}
                    </span>
                  )}
                  <span className="quem">{autor?.nome || 'Membro'}</span>
                  <span className="quando">{formatarData(r.criadoEm)}</span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
