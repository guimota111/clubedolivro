import { useState, useRef } from 'react'
import Modal from './Modal'
import { cadastrarLivro, cadastrarProximoLivro } from '../lib/db'
import { enviarImagem } from '../lib/storage'
import { IconeLivro } from './Icones'

// Formulário de livro do clube, nos dois modos em que ele é usado:
//   'clube' — o livro que todo mundo está lendo. Ao criar um novo, o anterior
//             é arquivado no histórico e o progresso de todos recomeça.
//   'fila'  — o PRÓXIMO livro, escolhido por quem já terminou o de agora. Ele
//             entra sem encerrar nada: o clube segue no livro atual até alguém
//             promover este na área do próximo livro.
export default function CadastrarLivroModal({
  modo = 'clube',
  temLivroAtual,
  proximoNaFila,
  onFechar,
  aoCadastrar,
}) {
  const paraFila = modo === 'fila'
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [dataLimite, setDataLimite] = useState('')
  const [dataInicio, setDataInicio] = useState('')
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
      const dados = {
        titulo: tituloLimpo,
        autor: autor.trim(),
        capaUrl: urlFinal,
        dataLimite: dataLimite || null,
        dataInicio: dataInicio || null,
      }
      const livroId = paraFila
        ? await cadastrarProximoLivro(dados)
        : await cadastrarLivro(dados)
      aoCadastrar?.(livroId)
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível cadastrar o livro. Tente novamente.')
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo={paraFila ? 'Próximo livro do clube' : 'Livro do clube'}
      onFechar={onFechar}
    >
      {paraFila ? (
        <p className="texto-suave" style={{ marginTop: 0 }}>
          Este livro entra na <strong>fila</strong>: o clube continua no livro de
          agora, mas quem já terminou pode começar a ler e marcar progresso desde
          já. Quando alguém o tornar o livro do clube, nada do que foi lido se
          perde.
        </p>
      ) : (
        <>
          {temLivroAtual && (
            <div className="aviso">
              Já existe um livro em leitura. Ao cadastrar um novo, o atual será
              encerrado e arquivado no histórico, e o progresso de todos recomeça do zero.
            </div>
          )}
          {proximoNaFila && (
            <div className="aviso">
              O clube já tem <strong>{proximoNaFila.titulo}</strong> na fila. Se é
              dele que você está falando, feche isto e use “Tornar o livro do
              clube” na área do próximo livro — assim o progresso de quem já
              começou é aproveitado.
            </div>
          )}
        </>
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
          <label htmlFor="data-inicio">Início da leitura (opcional)</label>
          <input
            id="data-inicio"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <span className="campo-dica">
            {paraFila
              ? 'É daqui que o relógio do ciclo vai contar quando ele virar o livro do clube. Em branco, vale o dia em que ele entrou na fila.'
              : 'Em branco, vale a data de hoje. É a partir daqui que conta o tempo decorrido do ciclo.'}
          </span>
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
            {paraFila
              ? 'A contagem regressiva só aparece quando ele virar o livro do clube.'
              : 'Aparece como contagem regressiva na página inicial.'}
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
          {enviando
            ? 'Salvando…'
            : paraFila
              ? 'Colocar na fila'
              : temLivroAtual
                ? 'Encerrar atual e iniciar novo'
                : 'Iniciar leitura'}
        </button>
      </form>
    </Modal>
  )
}
