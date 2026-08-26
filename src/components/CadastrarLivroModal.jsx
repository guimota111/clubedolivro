import { useState, useRef } from 'react'
import Modal from './Modal'
import { cadastrarLivro, cadastrarProximoLivro } from '../lib/db'
import { anunciar } from '../lib/push'
import { enviarImagem } from '../lib/storage'
import { chaveSerie, podeEntrarJunto, serieEmLeitura } from '../lib/series'
import { IconeLivro } from './Icones'

// Formulário de livro do clube, nos dois modos em que ele é usado:
//   'clube' — o livro que todo mundo está lendo. Ao criar um novo, o anterior
//             é arquivado no histórico e o progresso de todos recomeça.
//   'fila'  — o PRÓXIMO livro, escolhido por quem já terminou o de agora. Ele
//             entra sem encerrar nada: o clube segue no livro atual até alguém
//             promover este na área do próximo livro.
//
// A série é o que decide o destino do que já está em leitura. Cadastrar um
// livro da MESMA série dos que estão abertos não encerra nada: ele entra ao
// lado deles, e o clube passa a ler os dois (ou três) ao mesmo tempo. Qualquer
// outro livro é uma rodada nova — e aí a troca é a de sempre.
export default function CadastrarLivroModal({
  modo = 'clube',
  livrosAtuais = [],
  proximoNaFila,
  seriesConhecidas = [],
  serieInicial = '',
  onFechar,
  aoCadastrar,
}) {
  const paraFila = modo === 'fila'
  const temLivroAtual = livrosAtuais.length > 0
  const serieDaCasa = serieEmLeitura(livrosAtuais)
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [serie, setSerie] = useState(serieInicial)
  const [serieOrdem, setSerieOrdem] = useState('')
  const [dataLimite, setDataLimite] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [capaUrl, setCapaUrl] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const inputFile = useRef(null)

  // O livro entra AO LADO do que já está aberto quando é outro volume da mesma
  // série. É a única forma de o clube ter vários livros ativos — e a razão de
  // este formulário ter dois botões diferentes no fim.
  const juntarASerie =
    !paraFila && temLivroAtual && !!chaveSerie(serie) && podeEntrarJunto(livrosAtuais, serie)

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
        serie: serie.trim(),
        serieOrdem,
      }
      const livroId = paraFila
        ? await cadastrarProximoLivro(dados)
        : await cadastrarLivro(dados, { juntarASerie })
      // Livro novo é a notícia mais importante que a Patoteca tem para dar.
      // O da fila não avisa: ele ainda não é a leitura de ninguém.
      if (!paraFila) {
        anunciar(`livro-${livroId}`, `A Patoteca começou a ler ${tituloLimpo}.`)
      }
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
          {juntarASerie ? (
            <div className="aviso aviso-bom">
              Este livro é de <strong>{serieDaCasa}</strong>, a mesma série que o
              clube já está lendo: ele entra <strong>ao lado</strong> de{' '}
              {listarTitulos(livrosAtuais)}. Nada é encerrado e ninguém perde
              progresso — quem quiser passa a alternar entre os livros lá em cima.
            </div>
          ) : (
            temLivroAtual && (
              <div className="aviso">
                O clube já está lendo {listarTitulos(livrosAtuais)}. Ao cadastrar
                um livro de fora da série, {livrosAtuais.length > 1 ? 'esses livros são' : 'esse livro é'}{' '}
                encerrado e arquivado no histórico, e o progresso de todos recomeça do zero.
                {serieDaCasa ? (
                  <>
                    {' '}
                    Se você quer só emendar outro volume, escreva{' '}
                    <strong>{serieDaCasa}</strong> no campo de série — aí os dois
                    ficam abertos ao mesmo tempo.
                  </>
                ) : (
                  <>
                    {' '}
                    Se os dois são da mesma série e você quer lê-los ao mesmo
                    tempo, primeiro informe a série em{' '}
                    {listarTitulos(livrosAtuais)} (em “Corrigir dados do livro”) e
                    depois cadastre este com a mesma série.
                  </>
                )}
              </div>
            )
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
          <label htmlFor="serie">Série (opcional)</label>
          <input
            id="serie"
            type="text"
            list="series-do-clube"
            value={serie}
            maxLength={140}
            onChange={(e) => setSerie(e.target.value)}
            placeholder="Ex.: O Cemitério dos Livros Esquecidos"
          />
          <datalist id="series-do-clube">
            {seriesConhecidas.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
          <span className="campo-dica">
            {paraFila
              ? 'Sendo da mesma série dos livros em leitura, ele poderá entrar ao lado deles em vez de encerrá-los.'
              : juntarASerie
                ? 'Mesma série do que já está aberto: os livros vão conviver.'
                : 'Livros da mesma série podem ser lidos ao mesmo tempo pelo clube — é o que deixa cada um no seu volume.'}
          </span>
        </div>

        <div className="campo">
          <label htmlFor="serie-ordem">Número na série (opcional)</label>
          <input
            id="serie-ordem"
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
              : juntarASerie
                ? 'Adicionar à série'
                : temLivroAtual
                  ? 'Encerrar o que está aberto e iniciar novo'
                  : 'Iniciar leitura'}
        </button>
      </form>
    </Modal>
  )
}

// "A Sombra do Vento e O Jogo do Anjo" — a lista dos livros abertos escrita
// como se fala, para caber no meio de uma frase de aviso.
function listarTitulos(livros) {
  const titulos = livros.map((l) => `“${l.titulo}”`)
  if (titulos.length <= 1) return titulos[0] || ''
  return `${titulos.slice(0, -1).join(', ')} e ${titulos[titulos.length - 1]}`
}
