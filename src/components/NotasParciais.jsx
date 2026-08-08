import { useState } from 'react'
import { salvarNota, atualizarNota, excluirNota } from '../lib/db'
import { calcularPct, limitarPct, formatarData, inicial, posicaoDaNota } from '../lib/formato'
import { IconeMarcador, IconePena, IconeSeta, DivisoriaOrnamentada } from './Icones'
import { useVerFoto } from './FotoContext'
import Comentarios from './Comentarios'
import { REACOES } from '../lib/reacoes'

// A reação de uma nota é visível para TODOS, inclusive para quem ainda não
// desbloqueou o texto. Sozinha, ela não diz nada: o ponto do livro vem colado
// nela para que se saiba a que trecho aquele espanto (ou aquele choro) se
// refere.
function ReacaoNoPonto({ nota }) {
  const ponto = posicaoDaNota(nota)
  return (
    <span className="nota-reacao" title={`Reação deixada em ${ponto}`}>
      <span className="nota-emoji" aria-hidden="true">{nota.emoji || '💬'}</span>
      <span className="nota-ponto">
        <span className="sr-only">reação em </span>
        {ponto}
      </span>
    </span>
  )
}

// Notas parciais: cada membro pode deixar uma anotação "trancada" até uma
// página/porcentagem. Os outros só leem quando o próprio progresso alcança
// esse ponto. Serve para comentar trechos sem estragar a leitura de ninguém.
export default function NotasParciais({
  userId,
  livro,
  notas,
  comentariosPorAlvo,
  membrosPorId,
  minhaPct,
}) {
  const verFoto = useVerFoto()
  const [aberto, setAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null) // id da nota em edição
  const [texto, setTexto] = useState('')
  const [emoji, setEmoji] = useState('')
  const [modo, setModo] = useState('porcentagem') // 'porcentagem' | 'pagina'
  const [pct, setPct] = useState('')
  const [pagina, setPagina] = useState('')
  const [totalPag, setTotalPag] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [excluindoId, setExcluindoId] = useState(null)

  // Notas começam recolhidas: com a lista crescendo, abrir tudo de uma vez
  // deixa a página imensa. O cabeçalho e uma prévia de uma linha bastam para
  // achar a nota certa.
  const [abertas, setAbertas] = useState(() => new Set())

  function alternarNota(id) {
    setAbertas((antes) => {
      const nova = new Set(antes)
      if (nova.has(id)) nova.delete(id)
      else nova.add(id)
      return nova
    })
  }

  // Só as liberadas contam: a trancada não abre (não há o que mostrar além
  // do cadeado, que já aparece recolhido). Nota só de reação nunca tranca.
  const liberadas = notas.filter(
    (n) =>
      n.userId === userId ||
      !(n.texto || '').trim() ||
      minhaPct >= (n.desbloqueioPct || 0)
  )
  const todasAbertas = liberadas.length > 0 && liberadas.every((n) => abertas.has(n.id))

  function alternarTodas() {
    setAbertas(todasAbertas ? new Set() : new Set(liberadas.map((n) => n.id)))
  }

  function limpar() {
    setTexto('')
    setEmoji('')
    setModo('porcentagem')
    setPct('')
    setPagina('')
    setTotalPag('')
    setErro('')
    setEditandoId(null)
    setAberto(false)
  }

  // Abre o formulário já preenchido para editar uma nota existente.
  function iniciarEdicao(n) {
    setEditandoId(n.id)
    setTexto(n.texto || '')
    setEmoji(n.emoji || '')
    if (n.desbloqueioTipo === 'pagina') {
      setModo('pagina')
      setPagina(n.desbloqueioValor != null ? String(n.desbloqueioValor) : '')
      setTotalPag(n.totalPaginas != null ? String(n.totalPaginas) : '')
      setPct('')
    } else {
      setModo('porcentagem')
      setPct(String(n.desbloqueioValor ?? n.desbloqueioPct ?? ''))
      setPagina('')
      setTotalPag('')
    }
    setErro('')
    setAberto(true)
    // Quem está editando quer ver o resultado: deixa a nota expandida.
    setAbertas((antes) => new Set(antes).add(n.id))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function excluir(n) {
    const ok = window.confirm('Excluir esta nota? Os comentários dela também somem.')
    if (!ok) return
    setExcluindoId(n.id)
    try {
      await excluirNota(n.id)
      if (editandoId === n.id) limpar()
    } catch (err) {
      console.error(err)
      window.alert('Não foi possível excluir a nota.')
    } finally {
      setExcluindoId(null)
    }
  }

  async function aoEnviar(e) {
    e.preventDefault()
    const limpo = texto.trim()
    // Uma nota pode ser só a reação: o emoji sozinho já diz o que a pessoa
    // sentiu naquele ponto do livro. O que não pode é vir vazia dos dois.
    if (!limpo && !emoji) {
      setErro('Escreva a nota ou escolha uma reação.')
      return
    }

    let desbloqueioPct
    let desbloqueioValor
    let totalPaginas = null
    if (modo === 'pagina') {
      const p = Number(pagina)
      const t = Number(totalPag)
      if (!(t > 0)) {
        setErro('Informe o total de páginas da sua edição.')
        return
      }
      if (!(p >= 0)) {
        setErro('Informe a página de desbloqueio.')
        return
      }
      desbloqueioPct = calcularPct(Math.min(p, t), t)
      desbloqueioValor = Math.round(p)
      totalPaginas = Math.round(t)
    } else {
      desbloqueioPct = limitarPct(pct === '' ? 0 : Number(pct))
      desbloqueioValor = desbloqueioPct
    }

    const dados = {
      texto: limpo.slice(0, 4999),
      emoji,
      desbloqueioPct,
      desbloqueioTipo: modo,
      desbloqueioValor,
      totalPaginas,
    }

    setEnviando(true)
    setErro('')
    try {
      if (editandoId) {
        await atualizarNota(editandoId, dados)
      } else {
        await salvarNota(userId, livro.id, dados)
      }
      limpar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível salvar a nota.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="painel">
      <h2 className="secao-titulo">
        <IconeMarcador size={22} /> Notas parciais
      </h2>
      <DivisoriaOrnamentada
        style={{ width: '55%', height: 14, margin: '0 auto 1rem', color: 'var(--dourado)', opacity: 0.7 }}
      />
      <p className="texto-suave centro" style={{ marginTop: 0 }}>
        Comente um trecho sem spoiler: a nota fica trancada até a página ou % que
        você escolher — os outros só leem quando chegam lá.
      </p>

      {!aberto ? (
        <div className="centro">
          <button className="btn btn-fantasma" onClick={() => setAberto(true)}>
            <IconePena size={16} /> Escrever nota parcial
          </button>
        </div>
      ) : (
        <form className="nota-form" onSubmit={aoEnviar}>
          <div className="campo">
            <label htmlFor="nota-texto">
              Sua anotação {emoji ? '(opcional — a reação já basta)' : ''}
            </label>
            <textarea
              id="nota-texto"
              value={texto}
              maxLength={4999}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O que você achou desse trecho… (ou publique só a reação)"
            />
          </div>

          <label className="campo-rotulo">
            Sua reação (todos veem, mesmo quem está atrás)
          </label>
          <div className="reacao-paleta" role="radiogroup" aria-label="Reação">
            {REACOES.map((e) => (
              <button
                type="button"
                key={e}
                role="radio"
                aria-checked={emoji === e}
                aria-label={`Reação ${e}`}
                className={`reacao-opcao${emoji === e ? ' ativo' : ''}`}
                onClick={() => setEmoji(emoji === e ? '' : e)}
              >
                {e}
              </button>
            ))}
          </div>

          <label className="campo-rotulo">Liberar a partir de…</label>
          <div className="seletor-modo" role="tablist" aria-label="Tipo de desbloqueio">
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'porcentagem'}
              className={`seletor-opcao${modo === 'porcentagem' ? ' ativo' : ''}`}
              onClick={() => setModo('porcentagem')}
            >
              Porcentagem
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'pagina'}
              className={`seletor-opcao${modo === 'pagina' ? ' ativo' : ''}`}
              onClick={() => setModo('pagina')}
            >
              Página
            </button>
          </div>

          {modo === 'porcentagem' ? (
            <div className="campo" style={{ marginTop: '0.7rem' }}>
              <label htmlFor="nota-pct">Porcentagem de desbloqueio</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="nota-pct"
                  type="number"
                  min="0"
                  max="100"
                  value={pct}
                  placeholder="Ex.: 50"
                  onChange={(e) => setPct(e.target.value)}
                  style={{ maxWidth: 120 }}
                />
                <span className="texto-suave" style={{ fontSize: '1.2rem' }}>%</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
              <div className="campo" style={{ flex: '1 1 120px', margin: 0 }}>
                <label htmlFor="nota-pag">Página de desbloqueio</label>
                <input
                  id="nota-pag"
                  type="number"
                  min="0"
                  value={pagina}
                  placeholder="Ex.: 120"
                  onChange={(e) => setPagina(e.target.value)}
                />
              </div>
              <div className="campo" style={{ flex: '1 1 120px', margin: 0 }}>
                <label htmlFor="nota-total">Total (sua edição)</label>
                <input
                  id="nota-total"
                  type="number"
                  min="1"
                  value={totalPag}
                  placeholder="Ex.: 256"
                  onChange={(e) => setTotalPag(e.target.value)}
                />
              </div>
            </div>
          )}

          {erro && <div className="erro">{erro}</div>}

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={enviando}>
              <IconeMarcador size={16} />
              {enviando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Publicar nota'}
            </button>
            <button className="btn btn-fantasma" type="button" onClick={limpar}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {notas.length > 0 && (
        <>
          {liberadas.length > 1 && (
            <div className="notas-barra">
              <span className="texto-tenue">
                {notas.length} nota{notas.length > 1 ? 's' : ''}
              </span>
              <button type="button" className="btn-texto" onClick={alternarTodas}>
                {todasAbertas ? 'Recolher todas' : 'Expandir todas'}
              </button>
            </div>
          )}

          <div className="notas-lista">
            {notas.map((n) => {
              const autor = membrosPorId[n.userId]
              const souAutor = n.userId === userId
              // Nota só de reação não esconde nada: a reação já é pública, e o
              // ponto do livro vem no selo. Trancá-la seria trancar o vazio.
              const semTexto = !(n.texto || '').trim()
              const liberada =
                souAutor || semTexto || minhaPct >= (n.desbloqueioPct || 0)
              const aberta = abertas.has(n.id)
              const nComentarios = (comentariosPorAlvo[n.id] || []).length
              return (
                <article
                  className={`nota${liberada ? '' : ' nota-trancada'}${aberta ? ' nota-aberta' : ''}`}
                  key={n.id}
                >
                  {/* O retrato fica FORA do botão: ele abre a foto em tamanho
                      grande, e um clicável dentro de outro seria ambíguo (e
                      HTML inválido). */}
                  <div className="nota-cabecalho">
                    {autor?.avatarUrl ? (
                      <img
                        src={autor.avatarUrl}
                        alt={autor.nome || ''}
                        className="nota-avatar avatar-clicavel"
                        onClick={() => verFoto(autor.avatarUrl, autor.nome)}
                      />
                    ) : (
                      <span className="nota-avatar nota-inicial">{inicial(autor?.nome)}</span>
                    )}

                    {liberada ? (
                      <button
                        type="button"
                        className="nota-alternar"
                        aria-expanded={aberta}
                        onClick={() => alternarNota(n.id)}
                      >
                        <span className="nota-identidade">
                          <ReacaoNoPonto nota={n} />
                          <span className="nota-quem">{autor?.nome || 'Membro'}</span>
                          {souAutor && <span className="nota-tag">sua nota</span>}
                          {nComentarios > 0 && (
                            <span className="nota-contador">
                              {nComentarios} 💬
                            </span>
                          )}
                        </span>
                        <span className="nota-quando">{formatarData(n.criadoEm)}</span>
                        <IconeSeta size={16} className="seta-alternar" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="nota-identidade nota-identidade-larga">
                        <ReacaoNoPonto nota={n} />
                        <span className="nota-quem">{autor?.nome || 'Membro'}</span>
                        <span className="nota-quando">{formatarData(n.criadoEm)}</span>
                      </span>
                    )}
                  </div>

                  {/* Recolhida, a nota mostra a primeira linha do texto — dá
                      para achar a que interessa sem abrir uma por uma. */}
                  {liberada && !aberta && !semTexto && (
                    <p className="nota-previa">{n.texto}</p>
                  )}

                  {liberada && aberta && (
                    <>
                      {!semTexto && <div className="nota-texto">{n.texto}</div>}
                      <Comentarios
                        alvoTipo="nota"
                        alvoId={n.id}
                        comentarios={comentariosPorAlvo[n.id] || []}
                        membrosPorId={membrosPorId}
                        userId={userId}
                      />
                    </>
                  )}

                  {/* A trancada não colapsa: não há o que esconder além do
                      cadeado, e vê-lo de relance é justamente o útil. */}
                  {/* O ponto do livro já aparece ao lado da reação, então aqui
                      basta dizer o que falta para chegar lá. */}
                  {!liberada && (
                    <div className="nota-cadeado">
                      <IconeMarcador size={16} />
                      <span>
                        Trancada — você está em {minhaPct}%.
                      </span>
                    </div>
                  )}

                  {souAutor && aberta && (
                    <div className="nota-acoes">
                      <button
                        type="button"
                        className="btn-texto"
                        onClick={() => iniciarEdicao(n)}
                      >
                        <IconePena size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        className="btn-texto nota-excluir"
                        onClick={() => excluir(n)}
                        disabled={excluindoId === n.id}
                      >
                        {excluindoId === n.id ? 'Excluindo…' : 'Excluir'}
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
