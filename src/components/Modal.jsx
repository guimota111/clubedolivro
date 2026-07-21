import { useEffect } from 'react'
import { Filigrana } from './Icones'

// Modal genérico com estética de painel de biblioteca.
export default function Modal({ titulo, onFechar, children }) {
  // Fecha com a tecla Esc.
  useEffect(() => {
    function aoTecla(e) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', aoTecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTecla)
      document.body.style.overflow = ''
    }
  }, [onFechar])

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar()
      }}
    >
      <div
        className="modal painel"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <Filigrana
          size={44}
          style={{ position: 'absolute', top: 6, right: 6, color: 'rgba(201,162,39,0.25)' }}
          aria-hidden="true"
        />
        <div className="modal-topo">
          <h2>{titulo}</h2>
          <button className="fechar" onClick={onFechar} aria-label="Fechar">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
