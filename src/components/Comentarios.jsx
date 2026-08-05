import { useState } from 'react'
import { publicarComentario } from '../lib/db'
import { formatarData, inicial } from '../lib/formato'
import { IconePena } from './Icones'
import { useVerFoto } from './FotoContext'

// Thread de comentários reutilizável — serve tanto para resenhas quanto para
// notas parciais. Só deve ser renderizado onde o conteúdo-alvo está visível
// (resenha liberada ou nota desbloqueada).
export default function Comentarios({ alvoTipo, alvoId, comentarios, membrosPorId, userId }) {
  const verFoto = useVerFoto()
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
      await publicarComentario(userId, {
        alvoTipo,
        alvoId,
        texto: limpo.slice(0, 1999),
      })
      setTexto('')
    } catch (err) {
      console.error(err)
      setErro('Não foi possível comentar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="comentarios">
      {comentarios.length > 0 && (
        <ul className="comentarios-lista">
          {comentarios.map((c) => {
            const autor = membrosPorId[c.userId]
            return (
              <li className="comentario" key={c.id}>
                {autor?.avatarUrl ? (
                  <img
                    src={autor.avatarUrl}
                    alt={autor.nome || ''}
                    className="comentario-avatar avatar-clicavel"
                    onClick={() => verFoto(autor.avatarUrl, autor.nome)}
                  />
                ) : (
                  <span className="comentario-avatar comentario-inicial">
                    {inicial(autor?.nome)}
                  </span>
                )}
                <div className="comentario-corpo">
                  <div className="comentario-topo">
                    <span className="comentario-quem">{autor?.nome || 'Membro'}</span>
                    <span className="comentario-quando">{formatarData(c.criadoEm)}</span>
                  </div>
                  <div className="comentario-texto">{c.texto}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <form className="comentario-form" onSubmit={aoEnviar}>
        <input
          type="text"
          value={texto}
          maxLength={1999}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Comentar…"
          aria-label="Escrever um comentário"
        />
        <button
          className="btn btn-fantasma comentario-enviar"
          type="submit"
          disabled={enviando || !texto.trim()}
          aria-label="Enviar comentário"
        >
          <IconePena size={15} />
          {enviando ? '…' : 'Enviar'}
        </button>
      </form>
      {erro && <div className="erro">{erro}</div>}
    </div>
  )
}
