import { useState, useRef } from 'react'
import Modal from './Modal'
import { cadastrarLivro } from '../lib/db'
import { enviarImagem } from '../lib/storage'
import { IconeLivro } from './Icones'

// Formulário para cadastrar o livro atual do clube.
// Ao criar um novo, o livro anterior é arquivado e o progresso zerado.
export default function CadastrarLivroModal({ temLivroAtual, onFechar, aoCadastrar }) {
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [dataLimite, setDataLimite] = useState('')
  const [capaUrl, setCapaUrl] = useState('')
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
    setCapaUrl('')
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
      const livroId = await cadastrarLivro({
        titulo: tituloLimpo,
        autor: autor.trim(),
        capaUrl: urlFinal,
        dataLimite: dataLimite || null,
      })
      aoCadastrar?.(livroId)
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível cadastrar o livro. Tente novamente.')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Livro do clube" onFechar={onFechar}>
      {temLivroAtual && (
        <div className="aviso">
          Já existe um livro em leitura. Ao cadastrar um novo, o atual será
          encerrado e arquivado no histórico, e o progresso de todos recomeça do zero.
        </div>
      )}

      <form onSubmit={aoEnviar} style={{ marginTop: '1rem' }}>
        <div className="campo">
          <label htmlFor="titulo">Título</label>
          <input
            id="titulo"
            type="text"
            value={titulo}
            maxLength={140}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Dom Casmurro"
          />
        </div>

        <div className="campo">
          <label htmlFor="autor">Autor</label>
          <input
            id="autor"
            type="text"
            value={autor}
            maxLength={140}
            onChange={(e) => setAutor(e.target.value)}
            placeholder="Ex.: Machado de Assis"
          />
        </div>

        <div className="campo">
          <label htmlFor="data-limite">Data-limite para terminar (opcional)</label>
          <input
            id="data-limite"
            type="date"
            value={dataLimite}
            onChange={(e) => setDataLimite(e.target.value)}
          />
          <span className="campo-dica">
            Aparece como contagem regressiva na página inicial.
          </span>
        </div>

        <div className="campo">
          <label htmlFor="capaUrl">Capa (URL da imagem)</label>
          <input
            id="capaUrl"
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
          <label>…ou envie a imagem da capa</label>
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
          {enviando ? 'Salvando…' : temLivroAtual ? 'Encerrar atual e iniciar novo' : 'Iniciar leitura'}
        </button>
      </form>
    </Modal>
  )
}
