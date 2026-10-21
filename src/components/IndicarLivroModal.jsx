import { useState, useRef } from 'react'
import Modal from './Modal'
import { indicarLivro, atualizarIndicacao, removerIndicacao } from '../lib/db'
import { enviarImagem } from '../lib/storage'
import { buscarLivros } from '../lib/livrosApi'
import { anunciar } from '../lib/push'
import { textoIndicacaoNova, textoIndicacaoAlterada } from '../lib/atividades'
import {
  LIMITE_TEXTO_INDICACAO,
  chaveTitulo,
  indicacaoRepetida,
} from '../lib/eleicao'
import { IconeLivro, IconeUrna } from './Icones'

// Indicar um livro para a eleição — ou corrigir uma indicação já feita.
//
// Em dois passos: primeiro a busca (Google Books), que preenche título,
// autor, páginas e capa; depois o formulário, onde tudo pode ser corrigido e
// onde entra o texto de defesa. Quem não achar o livro pula a busca e
// preenche na mão.
export default function IndicarLivroModal({
  userId,
  eleicao,
  indicacoes = [],
  indicacaoExistente = null,
  titulosJaLidos = [],
  seriesConhecidas = [],
  onFechar,
}) {
  const editando = !!indicacaoExistente
  const [passo, setPasso] = useState(editando ? 'form' : 'busca')

  // ---- busca ----
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [erroBusca, setErroBusca] = useState('')

  // ---- formulário ----
  const [fonteId, setFonteId] = useState(indicacaoExistente?.fonteId || '')
  const [titulo, setTitulo] = useState(indicacaoExistente?.titulo || '')
  const [autor, setAutor] = useState(indicacaoExistente?.autor || '')
  const [paginas, setPaginas] = useState(
    indicacaoExistente?.totalPaginas != null ? String(indicacaoExistente.totalPaginas) : ''
  )
  const [capaUrl, setCapaUrl] = useState(indicacaoExistente?.capaUrl || '')
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState('')
  const [emColecao, setEmColecao] = useState(!!indicacaoExistente?.serie)
  const [serie, setSerie] = useState(indicacaoExistente?.serie || '')
  const [serieOrdem, setSerieOrdem] = useState(
    indicacaoExistente?.serieOrdem != null ? String(indicacaoExistente.serieOrdem) : ''
  )
  const [texto, setTexto] = useState(indicacaoExistente?.texto || '')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const inputFile = useRef(null)

  async function aoBuscar(e) {
    e?.preventDefault()
    const limpo = termo.trim()
    if (!limpo) return
    setBuscando(true)
    setErroBusca('')
    try {
      const lista = await buscarLivros(limpo)
      setResultados(lista)
    } catch (err) {
      console.error(err)
      setErroBusca(
        'Nenhuma das fontes de busca respondeu. Dá para tentar de novo ou preencher os dados na mão.'
      )
      setResultados(null)
    } finally {
      setBuscando(false)
    }
  }

  function escolherResultado(r) {
    setFonteId(r.fonteId)
    setTitulo(r.titulo)
    setAutor(r.autor)
    setPaginas(r.totalPaginas != null ? String(r.totalPaginas) : '')
    setCapaUrl(r.capaUrl)
    setArquivo(null)
    setPreview('')
    setErro('')
    setPasso('form')
  }

  function preencherNaMao() {
    setFonteId('')
    setErro('')
    setPasso('form')
  }

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

  // O clube já leu este livro? Só avisa — reler é escolha do clube.
  const jaLido = titulosJaLidos.some((t) => t && chaveTitulo(t) === chaveTitulo(titulo))
  // Alguém já indicou este livro? Aí não entra de novo: dois iguais na
  // prateleira só dividiriam os votos.
  const repetida = titulo.trim()
    ? indicacaoRepetida(indicacoes, { titulo, fonteId }, indicacaoExistente?.id)
    : null

  async function aoEnviar(e) {
    e.preventDefault()
    const tituloLimpo = titulo.trim()
    const textoLimpo = texto.trim()
    if (!tituloLimpo) {
      setErro('Informe o título do livro.')
      return
    }
    if (repetida) {
      setErro(`“${repetida.titulo}” já está na eleição. Indique outro livro.`)
      return
    }
    if (!textoLimpo) {
      setErro('Escreva por que o clube deveria ler este livro — é isso que convence os outros.')
      return
    }
    if (emColecao && !serie.trim()) {
      setErro('Diga o nome da coleção ou série — ou desmarque a opção.')
      return
    }
    if (editando) {
      const ok = window.confirm(
        'Salvar a correção?\n\n' +
          'Quem já votou neste livro votou no que viu. Ao salvar, os votos que ' +
          'ele recebeu são apagados e o clube é avisado para votar de novo.'
      )
      if (!ok) return
    }
    setEnviando(true)
    setErro('')
    try {
      let urlFinal = capaUrl.trim()
      if (arquivo) urlFinal = await enviarImagem('capas', arquivo, 'capa')
      const dados = {
        titulo: tituloLimpo,
        autor: autor.trim(),
        capaUrl: urlFinal,
        totalPaginas: paginas,
        serie: emColecao ? serie.trim() : '',
        serieOrdem: emColecao ? serieOrdem : '',
        texto: textoLimpo.slice(0, LIMITE_TEXTO_INDICACAO),
        fonteId,
      }
      if (editando) {
        await atualizarIndicacao(indicacaoExistente.id, dados)
        anunciar(`indicacao-${indicacaoExistente.id}`, textoIndicacaoAlterada(tituloLimpo))
      } else {
        const id = await indicarLivro(userId, eleicao.id, dados)
        // O aviso não diz quem indicou — nem o id do evento entrega.
        anunciar(`indicacao-${id}`, textoIndicacaoNova(tituloLimpo))
      }
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível salvar a indicação. Tente novamente.')
      setEnviando(false)
    }
  }

  async function retirar() {
    const ok = window.confirm(
      `Retirar “${indicacaoExistente.titulo}” da eleição?\n\n` +
        'Os votos que ele recebeu são apagados. Você pode indicar outro livro no lugar.'
    )
    if (!ok) return
    setEnviando(true)
    setErro('')
    try {
      await removerIndicacao(indicacaoExistente.id)
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível retirar a indicação. Tente novamente.')
      setEnviando(false)
    }
  }

  const tituloModal = editando ? 'Corrigir indicação' : 'Indicar um livro'

  if (passo === 'busca') {
    return (
      <Modal titulo={tituloModal} onFechar={onFechar}>
        <p className="texto-suave" style={{ marginTop: 0 }}>
          Procure o livro para puxar capa, autor e número de páginas. Tudo pode
          ser corrigido no passo seguinte.
        </p>
        <form onSubmit={aoBuscar} className="busca-livro">
          <div className="campo" style={{ marginBottom: 0, flex: 1 }}>
            <label htmlFor="busca-termo" className="sr-only">
              Título, autor ou ISBN
            </label>
            <input
              id="busca-termo"
              type="search"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Título, autor ou ISBN"
              autoFocus
            />
          </div>
          <button className="btn" type="submit" disabled={buscando || !termo.trim()}>
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {erroBusca && <div className="erro">{erroBusca}</div>}

        {resultados && resultados.length === 0 && (
          <p className="texto-suave">
            Nada encontrado com esse texto. Tente o nome do autor junto, ou o
            ISBN que fica na contracapa.
          </p>
        )}

        {resultados && resultados.length > 0 && (
          <ul className="busca-resultados">
            {resultados.map((r) => (
              <li key={r.fonteId}>
                <button type="button" className="busca-item" onClick={() => escolherResultado(r)}>
                  {r.capaUrl ? (
                    <img className="capinha" src={r.capaUrl} alt="" />
                  ) : (
                    <div className="capinha capinha-vazia">
                      <IconeLivro size={16} />
                    </div>
                  )}
                  <span className="busca-dados">
                    <strong>{r.titulo}</strong>
                    {r.autor && <span className="autor">{r.autor}</span>}
                    <span className="busca-meta">
                      {[
                        r.totalPaginas ? `${r.totalPaginas} páginas` : '',
                        r.editora,
                        r.ano,
                        r.idioma && r.idioma !== 'pt' ? r.idioma.toUpperCase() : '',
                        r.fonte === 'Open Library' ? 'Open Library' : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="centro" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn-texto" onClick={preencherNaMao}>
            Não achei — preencher na mão
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal titulo={tituloModal} onFechar={onFechar}>
      {editando && (
        <div className="aviso">
          Corrigir a indicação <strong>apaga os votos</strong> que este livro já
          recebeu — quem votou, votou no que viu. O clube é avisado para votar de
          novo.
        </div>
      )}

      <form onSubmit={aoEnviar} style={{ marginTop: editando ? '1rem' : 0 }}>
        {!editando && (
          <div className="centro" style={{ marginBottom: '0.8rem' }}>
            <button type="button" className="btn-texto" onClick={() => setPasso('busca')}>
              ← Voltar à busca
            </button>
          </div>
        )}

        <div className="indicacao-form-topo">
          <div className="indicacao-capa">
            {preview || capaUrl ? (
              <img src={preview || capaUrl} alt="Prévia da capa" />
            ) : (
              <div className="capa-sem-imagem">
                <IconeLivro size={28} />
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="campo">
              <label htmlFor="ind-titulo">Título</label>
              <input
                id="ind-titulo"
                type="text"
                value={titulo}
                maxLength={140}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Dom Casmurro"
              />
            </div>
            <div className="campo">
              <label htmlFor="ind-autor">Autor</label>
              <input
                id="ind-autor"
                type="text"
                value={autor}
                maxLength={140}
                onChange={(e) => setAutor(e.target.value)}
                placeholder="Ex.: Machado de Assis"
              />
            </div>
            <div className="campo">
              <label htmlFor="ind-paginas">Número de páginas</label>
              <input
                id="ind-paginas"
                type="number"
                min="1"
                max="99999"
                value={paginas}
                onChange={(e) => setPaginas(e.target.value)}
                placeholder="Ex.: 256"
                style={{ maxWidth: 140 }}
              />
            </div>
          </div>
        </div>

        {repetida && (
          <div className="aviso">
            <strong>{repetida.titulo}</strong> já está na eleição. Dois iguais na
            prateleira só dividiriam os votos — indique outro livro.
          </div>
        )}
        {!repetida && jaLido && (
          <div className="aviso">
            O clube já leu <strong>{titulo.trim()}</strong>. Pode indicar mesmo
            assim — reler também é leitura.
          </div>
        )}

        <div className="campo">
          <label htmlFor="ind-capa">Capa (URL da imagem)</label>
          <input
            id="ind-capa"
            type="url"
            value={capaUrl}
            onChange={(e) => {
              setCapaUrl(e.target.value)
              setArquivo(null)
              setPreview('')
            }}
            placeholder="https://…"
          />
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
            style={{ marginTop: '0.6rem' }}
            onClick={() => inputFile.current?.click()}
          >
            <IconeLivro size={18} />
            {arquivo ? 'Trocar a imagem enviada' : '…ou enviar outra imagem'}
          </button>
        </div>

        <div className="campo">
          <label className="campo-caixa">
            <input
              type="checkbox"
              checked={emColecao}
              onChange={(e) => setEmColecao(e.target.checked)}
            />
            <span>Este livro faz parte de uma coleção ou série</span>
          </label>
          <span className="campo-dica">
            Se ele vencer, os próximos livros do clube serão os da coleção, na
            ordem.
          </span>
        </div>

        {emColecao && (
          <div className="indicacao-serie">
            <div className="campo">
              <label htmlFor="ind-serie">Nome da coleção</label>
              <input
                id="ind-serie"
                type="text"
                list="series-da-eleicao"
                value={serie}
                maxLength={140}
                onChange={(e) => setSerie(e.target.value)}
                placeholder="Ex.: O Cemitério dos Livros Esquecidos"
              />
              <datalist id="series-da-eleicao">
                {seriesConhecidas.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
            </div>
            <div className="campo">
              <label htmlFor="ind-serie-ordem">Este é o livro nº</label>
              <input
                id="ind-serie-ordem"
                type="number"
                min="1"
                max="999"
                value={serieOrdem}
                onChange={(e) => setSerieOrdem(e.target.value)}
                placeholder="Ex.: 1"
                style={{ maxWidth: 120 }}
              />
            </div>
          </div>
        )}

        <div className="campo">
          <label htmlFor="ind-texto">Por que o clube deveria ler este livro?</label>
          <textarea
            id="ind-texto"
            value={texto}
            maxLength={LIMITE_TEXTO_INDICACAO}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Convença a Patoteca. Ninguém vai saber que foi você quem escreveu — até a apuração."
            style={{ minHeight: 140 }}
          />
          <span className="campo-dica">
            {texto.length}/{LIMITE_TEXTO_INDICACAO} caracteres. Sem spoiler, de
            preferência.
          </span>
        </div>

        {erro && <div className="erro">{erro}</div>}

        <button
          className="btn"
          type="submit"
          disabled={enviando || !!repetida}
          style={{ width: '100%' }}
        >
          <IconeUrna size={18} />
          {enviando ? 'Salvando…' : editando ? 'Salvar correção' : 'Indicar este livro'}
        </button>

        {editando && (
          <div className="centro" style={{ marginTop: '0.8rem' }}>
            <button type="button" className="btn-texto" onClick={retirar} disabled={enviando}>
              Retirar esta indicação
            </button>
          </div>
        )}
      </form>
    </Modal>
  )
}
