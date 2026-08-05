import { useMemo, useState } from 'react'
import { salvarResenha } from '../lib/db'
import { pctDoProgresso, formatarData, inicial } from '../lib/formato'
import { IconeLivro, IconePena, IconeLivroAberto } from './Icones'
import { useVerFoto } from './FotoContext'

// Aba de Resenhas: liberada por livro para quem chegou a 100%.
// Junta o livro atual (se terminado) e os livros já encerrados no histórico.
export default function Resenhas({
  userId,
  livroAtual,
  historico,
  meuProgressoPorLivro,
  resenhasPorLivro,
  membrosPorId,
}) {
  // Monta a lista de livros "resenhaveis": atual + histórico (sem duplicar).
  const livros = useMemo(() => {
    const lista = []
    const vistos = new Set()
    if (livroAtual) {
      lista.push({
        id: livroAtual.id,
        titulo: livroAtual.titulo,
        autor: livroAtual.autor,
        capaUrl: livroAtual.capaUrl,
        totalPaginas: livroAtual.totalPaginas,
        atual: true,
      })
      vistos.add(livroAtual.id)
    }
    historico.forEach((h) => {
      if (vistos.has(h.id)) return
      lista.push({
        id: h.id,
        titulo: h.titulo,
        autor: h.autor,
        capaUrl: h.capaUrl,
        atual: false,
      })
      vistos.add(h.id)
    })
    return lista
  }, [livroAtual, historico])

  if (!livros.length) {
    return (
      <section className="painel">
        <p className="centro texto-suave">
          Ainda não há livros para resenhar. As resenhas aparecem quando um livro
          é lido até o fim.
        </p>
      </section>
    )
  }

  return (
    <div className="resenhas-view">
      {livros.map((livro) => {
        const minhaPct = pctDoProgresso(
          meuProgressoPorLivro[livro.id],
          livro.totalPaginas || 0
        )
        const terminei = minhaPct >= 100
        const resenhas = resenhasPorLivro[livro.id] || []
        const minhaResenha = resenhas.find((r) => r.userId === userId)
        return (
          <section className="painel resenha-livro" key={livro.id}>
            <div className="resenha-livro-topo">
              {livro.capaUrl ? (
                <img className="capinha" src={livro.capaUrl} alt={`Capa de ${livro.titulo}`} />
              ) : (
                <div className="capinha capinha-vazia">
                  <IconeLivro size={20} />
                </div>
              )}
              <div>
                <h3 style={{ margin: 0 }}>{livro.titulo}</h3>
                {livro.autor && <div className="autor">{livro.autor}</div>}
                <span className={`resenha-selo${livro.atual ? ' selo-atual' : ''}`}>
                  {livro.atual ? 'Lendo agora' : 'Já encerrado'}
                </span>
              </div>
            </div>

            {!terminei ? (
              <div className="resenha-trancada">
                <IconeLivroAberto size={20} />
                <span>
                  As resenhas deste livro liberam quando você termina (100%). Você
                  está em {minhaPct}%.
                </span>
              </div>
            ) : (
              <>
                <FormResenha
                  userId={userId}
                  livroId={livro.id}
                  resenhaExistente={minhaResenha}
                />
                <ListaResenhas
                  resenhas={resenhas}
                  membrosPorId={membrosPorId}
                  meuUserId={userId}
                />
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}

function Estrelas({ valor, onChange, leitura = false }) {
  return (
    <div className={`estrelas${leitura ? ' estrelas-leitura' : ''}`} role="radiogroup" aria-label="Nota">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`estrela${n <= valor ? ' cheia' : ''}`}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          aria-checked={n === valor}
          role="radio"
          disabled={leitura}
          onClick={() => !leitura && onChange(n === valor ? 0 : n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function FormResenha({ userId, livroId, resenhaExistente }) {
  const [texto, setTexto] = useState(resenhaExistente?.texto || '')
  const [nota, setNota] = useState(resenhaExistente?.nota || 0)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  async function aoEnviar(e) {
    e.preventDefault()
    const limpo = texto.trim()
    if (!limpo) {
      setErro('Escreva sua resenha.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      await salvarResenha(userId, livroId, { texto: limpo.slice(0, 4999), nota })
      setOk(true)
      setTimeout(() => setOk(false), 2500)
    } catch (err) {
      console.error(err)
      setErro('Não foi possível salvar a resenha.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form className="resenha-form" onSubmit={aoEnviar}>
      <div className="campo">
        <label htmlFor={`res-${livroId}`}>
          {resenhaExistente ? 'Editar sua resenha' : 'Sua resenha'}
        </label>
        <textarea
          id={`res-${livroId}`}
          value={texto}
          maxLength={4999}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Agora pode ter spoiler — todo mundo aqui terminou o livro."
        />
      </div>
      <div className="resenha-nota-linha">
        <span className="texto-suave">Sua nota:</span>
        <Estrelas valor={nota} onChange={setNota} />
      </div>
      {erro && <div className="erro">{erro}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
        <button className="btn" type="submit" disabled={salvando}>
          <IconePena size={16} />
          {salvando ? 'Salvando…' : resenhaExistente ? 'Atualizar resenha' : 'Publicar resenha'}
        </button>
        {ok && <span className="resenha-ok">Resenha salva!</span>}
      </div>
    </form>
  )
}

function ListaResenhas({ resenhas, membrosPorId, meuUserId }) {
  const verFoto = useVerFoto()
  const outras = resenhas
    .filter((r) => r.userId !== meuUserId)
    .sort((a, b) => (b.atualizadoEm?.seconds || 0) - (a.atualizadoEm?.seconds || 0))

  if (!outras.length) {
    return (
      <p className="texto-suave" style={{ marginTop: '1rem' }}>
        Ninguém mais publicou resenha deste livro ainda.
      </p>
    )
  }

  return (
    <div className="resenhas-lista">
      {outras.map((r) => {
        const autor = membrosPorId[r.userId]
        return (
          <article className="resenha-item" key={r.id}>
            <div className="resenha-cabecalho">
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
              <span className="nota-quem">{autor?.nome || 'Membro'}</span>
              {r.nota > 0 && <Estrelas valor={r.nota} leitura />}
              <span className="nota-quando">{formatarData(r.atualizadoEm)}</span>
            </div>
            <div className="nota-texto">{r.texto}</div>
          </article>
        )
      })}
    </div>
  )
}
