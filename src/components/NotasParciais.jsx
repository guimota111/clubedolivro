import { useState } from 'react'
import { salvarNota, atualizarNota, excluirNota } from '../lib/db'
import { calcularPct, limitarPct, formatarData, inicial } from '../lib/formato'
import { IconeMarcador, IconePena, DivisoriaOrnamentada } from './Icones'
import { useVerFoto } from './FotoContext'
import Comentarios from './Comentarios'
import { REACOES } from '../lib/reacoes'

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
    if (!limpo) {
      setErro('Escreva a nota.')
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
            <label htmlFor="nota-texto">Sua anotação</label>
            <textarea
              id="nota-texto"
              value={texto}
              maxLength={4999}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O que você achou desse trecho…"
            />
          </div>

          <label className="campo-rotulo">Sua reação (todos veem, mesmo quem está atrás)</label>
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
        <div className="notas-lista">
          {notas.map((n) => {
            const autor = membrosPorId[n.userId]
            const souAutor = n.userId === userId
            const liberada = souAutor || minhaPct >= (n.desbloqueioPct || 0)
            const alvoTxt =
              n.desbloqueioTipo === 'pagina'
                ? `página ${n.desbloqueioValor}${n.totalPaginas ? `/${n.totalPaginas}` : ''} (${n.desbloqueioPct}%)`
                : `${n.desbloqueioPct}%`
            return (
              <article className={`nota${liberada ? '' : ' nota-trancada'}`} key={n.id}>
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
                  {n.emoji && (
                    <span className="nota-emoji" aria-label="Reação">{n.emoji}</span>
                  )}
                  <span className="nota-quem">{autor?.nome || 'Membro'}</span>
                  {souAutor && <span className="nota-tag">sua nota</span>}
                  <span className="nota-quando">{formatarData(n.criadoEm)}</span>
                </div>

                {liberada ? (
                  <>
                    <div className="nota-texto">{n.texto}</div>
                    <Comentarios
                      alvoTipo="nota"
                      alvoId={n.id}
                      comentarios={comentariosPorAlvo[n.id] || []}
                      membrosPorId={membrosPorId}
                      userId={userId}
                    />
                  </>
                ) : (
                  <div className="nota-cadeado">
                    <IconeMarcador size={16} />
                    <span>
                      Trancada — desbloqueia em <strong>{alvoTxt}</strong>. Você está
                      em {minhaPct}%.
                    </span>
                  </div>
                )}

                {souAutor && (
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
      )}
    </section>
  )
}
