import { useState, useRef } from 'react'
import Modal from './Modal'
import { atualizarLivro } from '../lib/db'
import { enviarImagem } from '../lib/storage'
import { IconeLivro } from './Icones'

// Edita o livro atual (título, autor, total de páginas, capa) SEM encerrá-lo
// nem zerar o progresso de ninguém. Serve para corrigir dados.
export default function EditarLivroModal({ livro, onFechar }) {
  const [titulo, setTitulo] = useState(livro.titulo || '')
  const [autor, setAutor] = useState(livro.autor || '')
  const [capaUrl, setCapaUrl] = useState(livro.capaUrl || '')
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const inputFile = useRef(null)

  function aoEscolherCapa(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setErro('Escolha um arquivo de imagem.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setErro('A imagem deve ter no máximo 5 MB.')
      return
    }
    setErro('')
    setArquivo(f)
    setPreview(URL.createObjectURL(f))
  }

  async function aoEnviar(e) {
    e.preventDefault()
    const tituloLimpo = titulo.trim()
    if (!tituloLimpo) {
      setErro('Informe o título do livro.')
      return
    }
    setEnviando(true)
    setErro('')
    try {
      let urlFinal = capaUrl.trim()
      if (arquivo) {
        urlFinal = await enviarImagem('capas', arquivo, 'capa')
      }
      await atualizarLivro(livro.id, {
        titulo: tituloLimpo,
        autor: autor.trim(),
        capaUrl: urlFinal,
      })
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível salvar as alterações. Tente novamente.')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Editar livro" onFechar={onFechar}>
      <p className="texto-suave" style={{ marginTop: 0 }}>
        Corrija os dados do livro em leitura. O progresso de todos é mantido.
      </p>

      <form onSubmit={aoEnviar} style={{ marginTop: '1rem' }}>
        <div className="campo">
          <label htmlFor="edit-titulo">Título</label>
          <input
            id="edit-titulo"
            type="text"
            value={titulo}
            maxLength={140}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Dom Casmurro"
          />
        </div>

        <div className="campo">
          <label htmlFor="edit-autor">Autor</label>
          <input
            id="edit-autor"
            type="text"
            value={autor}
            maxLength={140}
            onChange={(e) => setAutor(e.target.value)}
            placeholder="Ex.: Machado de Assis"
          />
        </div>

        <div className="campo">
          <label htmlFor="edit-capaUrl">Capa (URL da imagem)</label>
          <input
            id="edit-capaUrl"
            type="url"
            value={capaUrl}
            onChange={(e) => {
              setCapaUrl(e.target.value)
              setArquivo(null)
              setPreview('')
            }}
            placeholder="https://…"
          />
        </div>

        <div className="campo">
          <label>…ou envie uma nova imagem de capa</label>
          <input
            ref={inputFile}
            type="file"
            accept="image/*"
            className="escondido"
            onChange={aoEscolherCapa}
          />
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => inputFile.current?.click()}
          >
            <IconeLivro size={18} />
            {arquivo ? 'Trocar capa' : 'Enviar capa'}
          </button>
          {(preview || capaUrl) && (
            <img
              src={preview || capaUrl}
              alt="Prévia da capa"
              style={{
                marginTop: '0.8rem',
                width: 90,
                aspectRatio: '2 / 3',
                objectFit: 'cover',
                borderRadius: 4,
                border: '1px solid rgba(201,162,39,0.5)',
              }}
            />
          )}
        </div>

        {erro && <div className="erro">{erro}</div>}

        <button className="btn" type="submit" disabled={enviando} style={{ width: '100%' }}>
          {enviando ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </form>
    </Modal>
  )
}
