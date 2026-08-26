import { useEffect, useId, useState } from 'react'
import { publicarComentario } from '../lib/db'
import { anunciar, meuNome } from '../lib/push'
import { textoDoComentario } from '../lib/atividades'
import { formatarData, inicial } from '../lib/formato'
import { IconePena, IconeSeta } from './Icones'
import { useVerFoto } from './FotoContext'

// Thread de comentários reutilizável — serve tanto para resenhas quanto para
// notas parciais. Só deve ser renderizado onde o conteúdo-alvo está visível
// (resenha liberada ou nota desbloqueada).
//
// A thread começa recolhida: com muitos comentários, deixá-las todas abertas
// alonga demais a página. O botão sempre diz quantos há, então dá para saber
// onde a conversa está sem abrir nada.
export default function Comentarios({ alvoTipo, alvoId, comentarios, membrosPorId, userId, abrirEm }) {
  const verFoto = useVerFoto()
  const idPainel = useId()
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const total = comentarios.length

  // Quem chega aqui por um aviso de novidades veio ver a conversa: ela abre
  // sozinha. `abrirEm` muda a cada clique, então funciona mais de uma vez.
  useEffect(() => {
    if (abrirEm) setAberto(true)
  }, [abrirEm])

  async function aoEnviar(e) {
    e.preventDefault()
    const limpo = texto.trim()
    if (!limpo) return
    setEnviando(true)
    setErro('')
    try {
      const comentarioId = await publicarComentario(userId, {
        alvoTipo,
        alvoId,
        texto: limpo.slice(0, 1999),
      })
      anunciar(`comentario-${comentarioId}`, textoDoComentario(meuNome(), alvoTipo))
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
      <button
        type="button"
        className="comentarios-alternar"
        aria-expanded={aberto}
        aria-controls={idPainel}
        onClick={() => setAberto((v) => !v)}
      >
        <IconeSeta size={14} className="seta-alternar" aria-hidden="true" />
        {total === 0
          ? 'Comentar'
          : `${total} comentário${total > 1 ? 's' : ''}`}
      </button>

      <div id={idPainel} hidden={!aberto}>
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
    </div>
  )
}
