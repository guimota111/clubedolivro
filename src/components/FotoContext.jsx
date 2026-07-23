import { createContext, useContext, useState, useCallback, useEffect } from 'react'

// Context leve para abrir uma foto em tamanho grande a partir de qualquer avatar.
const FotoContext = createContext(() => {})

export function useVerFoto() {
  return useContext(FotoContext)
}

export function FotoProvider({ children }) {
  const [foto, setFoto] = useState(null) // { url, nome }

  const abrir = useCallback((url, nome) => {
    if (url) setFoto({ url, nome })
  }, [])
  const fechar = useCallback(() => setFoto(null), [])

  return (
    <FotoContext.Provider value={abrir}>
      {children}
      {foto && <VisualizadorFoto foto={foto} onFechar={fechar} />}
    </FotoContext.Provider>
  )
}

// Overlay com a foto ampliada, emoldurada como um retrato de biblioteca.
function VisualizadorFoto({ foto, onFechar }) {
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
      className="foto-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={foto.nome ? `Foto de ${foto.nome}` : 'Foto ampliada'}
    >
      <button className="fechar-foto" onClick={onFechar} aria-label="Fechar">
        &times;
      </button>
      <img src={foto.url} alt={foto.nome || 'Foto ampliada'} />
      {foto.nome && <div className="legenda">{foto.nome}</div>}
    </div>
  )
}
