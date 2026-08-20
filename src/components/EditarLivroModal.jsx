import { useState, useRef } from 'react'
import Modal from './Modal'
import { atualizarLivro, encerrarLivro } from '../lib/db'
import { enviarImagem } from '../lib/storage'
import { chaveSerie, normalizarSerie, ordemValida, serieEmLeitura } from '../lib/series'
import { IconeLivro } from './Icones'

// Edita um livro do clube (título, autor, série, capa, datas) SEM encerrá-lo
// nem zerar o progresso de ninguém. Serve para corrigir dados — tanto do livro
// em leitura quanto do que está na fila (`naFila`).
//
// É também daqui que se aposenta UM volume da série sem tocar nos outros:
// quando o clube tem vários livros abertos, encerrar todos de uma vez seria
// grosso demais para quem ainda está no segundo.
export default function EditarLivroModal({
  livro,
  naFila = false,
  livrosAtuais = [],
  seriesConhecidas = [],
  onFechar,
}) {
  const [titulo, setTitulo] = useState(livro.titulo || '')
  const [autor, setAutor] = useState(livro.autor || '')
  const [serie, setSerie] = useState(livro.serie || '')
  const [serieOrdem, setSerieOrdem] = useState(
    livro.serieOrdem != null ? String(livro.serieOrdem) : ''
  )
  const [dataLimite, setDataLimite] = useState(livro.dataLimite || '')
  const [dataInicio, setDataInicio] = useState(livro.dataInicio || '')
  const [capaUrl, setCapaUrl] = useState(livro.capaUrl || '')
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [encerrando, setEncerrando] = useState(false)
  const inputFile = useRef(null)

  // Os OUTROS livros que o clube tem abertos agora. Se existirem, este livro
  // não pode sair da série deles sozinho — seriam duas leituras paralelas sem
  // nada em comum, que é justamente o que a regra da série evita.
  const companheiros = livrosAtuais.filter((l) => l.id !== livro.id)
  const serieDaCasa = serieEmLeitura(livrosAtuais)
  const podeEncerrarSozinho = !naFila && companheiros.length > 0

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
    // Um livro em leitura ao lado de outros só existe porque todos são da
    // mesma série. Deixar mudar a série daqui quebraria isso pelas costas.
    if (companheiros.length && chaveSerie(serie) !== chaveSerie(serieDaCasa)) {
      setErro(
        `O clube está lendo vários livros de “${serieDaCasa}” ao mesmo tempo — ` +
          'todos precisam continuar na mesma série. Para tirar este daí, encerre-o ' +
          'aqui embaixo ou encerre os outros antes.'
      )
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
        dataLimite: dataLimite || null,
        dataInicio: dataInicio || null,
        serie: normalizarSerie(serie),
        serieOrdem: ordemValida(serieOrdem),
      })
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível salvar as alterações. Tente novamente.')
      setEnviando(false)
    }
  }

  async function encerrarSoEste() {
    const ok = window.confirm(
      `Encerrar “${livro.titulo}”?\n\n` +
        'Ele vai para o histórico com o vencedor da rodada e sai da tela de ' +
        'leitura. Os outros livros da série continuam abertos, e nada do que já ' +
        'foi lido, anotado ou resenhado é apagado.'
    )
    if (!ok) return
    setErro('')
    setEncerrando(true)
    try {
      await encerrarLivro(livro.id)
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível encerrar este livro. Tente novamente.')
      setEncerrando(false)
    }
  }

  return (
    <Modal titulo={naFila ? 'Editar o próximo livro' : 'Editar livro'} onFechar={onFechar}>
      <p className="texto-suave" style={{ marginTop: 0 }}>
        {naFila
          ? 'Corrija os dados do livro que está na fila. Ele continua na fila e o progresso de quem já começou é mantido.'
          : 'Corrija os dados do livro em leitura. O progresso de todos é mantido.'}
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
          <label htmlFor="edit-serie">Série (opcional)</label>
          <input
            id="edit-serie"
            type="text"
            list="series-do-clube-edicao"
            value={serie}
            maxLength={140}
            disabled={companheiros.length > 0}
            onChange={(e) => setSerie(e.target.value)}
            placeholder="Ex.: O Cemitério dos Livros Esquecidos"
          />
          <datalist id="series-do-clube-edicao">
            {seriesConhecidas.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
          <span className="campo-dica">
            {companheiros.length > 0
              ? `Travado enquanto o clube lê ${companheiros.length + 1} livros de “${serieDaCasa}” ao mesmo tempo: todos precisam ser da mesma série.`
              : 'Ligar o livro a uma série é o que permite ao clube ler vários volumes dela ao mesmo tempo.'}
          </span>
        </div>

        <div className="campo">
          <label htmlFor="edit-serie-ordem">Número na série (opcional)</label>
          <input
            id="edit-serie-ordem"
            type="number"
            min="1"
            max="999"
            value={serieOrdem}
            onChange={(e) => setSerieOrdem(e.target.value)}
            placeholder="Ex.: 2"
            style={{ maxWidth: 140 }}
          />
          <span className="campo-dica">
            É por ele que os volumes aparecem na ordem certa.
          </span>
        </div>

        <div className="campo">
          <label htmlFor="edit-data-inicio">Início da leitura (opcional)</label>
          <input
            id="edit-data-inicio"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <span className="campo-dica">
            É daqui que conta o tempo decorrido do ciclo. Em branco, vale o dia
            em que o livro entrou no site.
          </span>
        </div>

        <div className="campo">
          <label htmlFor="edit-data-limite">Data-limite para terminar (opcional)</label>
          <input
            id="edit-data-limite"
            type="date"
            value={dataLimite}
            onChange={(e) => setDataLimite(e.target.value)}
          />
          <span className="campo-dica">
            Deixe em branco para não exibir contagem regressiva.
          </span>
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

      {podeEncerrarSozinho && (
        <div className="encerrar-volume">
          <p className="texto-tenue" style={{ margin: '0 0 0.5rem' }}>
            O clube já terminou este volume e quer seguir só nos outros?
          </p>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={encerrarSoEste}
            disabled={encerrando}
            style={{ width: '100%' }}
          >
            {encerrando ? 'Encerrando…' : `Encerrar só “${livro.titulo}”`}
          </button>
        </div>
      )}
    </Modal>
  )
}
