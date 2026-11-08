import { useState } from 'react'
import { useFoco } from '../hooks/useFoco'
import { salvarResenha } from '../lib/db'
import { anunciar, meuNome } from '../lib/push'
import { textoDaResenha } from '../lib/atividades'
import { formatarData, inicial } from '../lib/formato'
import { rotuloSerie } from '../lib/series'
import { IconeLivro, IconePena, IconeLivroAberto, IconeSeta } from './Icones'
import { useVerFoto } from './FotoContext'
import Comentarios from './Comentarios'

// As resenhas de UM livro: o formulário de quem terminou e a lista do que os
// outros escreveram. Quem não terminou vê o cadeado e quanto falta — a
// resenha pode ter spoiler, e é por isso que só abre aos 100%.
//
// Aparece em dois lugares: na sub-aba "Resenhas" do livro (atual ou
// anterior) e na página de livros lidos, onde cada capa abre as suas.
export function ResenhasDoLivro({
  livro,
  situacao = 'atual',
  userId,
  minhaPct,
  resenhas = [],
  comentariosPorAlvo,
  membrosPorId,
  foco,
  aoVoltar = null,
  mostrarCabecalho = false,
}) {
  const minhaResenha = resenhas.find((r) => r.userId === userId)
  const terminei = minhaPct >= 100
  const serie = rotuloSerie(livro)

  return (
    <section className="painel resenha-livro">
      {aoVoltar && (
        <button type="button" className="btn-texto voltar-prateleira" onClick={aoVoltar}>
          <IconeSeta size={16} aria-hidden="true" />
          Todos os livros
        </button>
      )}

      {mostrarCabecalho ? (
        <div className="resenha-livro-topo">
          {livro.capaUrl ? (
            <img className="capinha" src={livro.capaUrl} alt={`Capa de ${livro.titulo}`} />
          ) : (
            <div className="capinha capinha-vazia">
              <IconeLivro size={20} />
            </div>
          )}
          <div>
            {serie && <div className="livro-serie">{serie}</div>}
            <h3 style={{ margin: 0 }}>{livro.titulo}</h3>
            {livro.autor && <div className="autor">{livro.autor}</div>}
            <SeloDaSituacao situacao={situacao} />
          </div>
        </div>
      ) : (
        <h2 className="secao-titulo">
          <IconePena size={22} /> Resenhas
        </h2>
      )}

      {!terminei ? (
        <div className="resenha-trancada">
          <IconeLivroAberto size={20} />
          <span>
            As resenhas deste livro liberam quando você termina (100%). Você está
            em {minhaPct}%.
            {resenhas.length > 0 && (
              <>
                {' '}
                {resenhas.length === 1
                  ? 'Já há 1 resenha à sua espera.'
                  : `Já há ${resenhas.length} resenhas à sua espera.`}
              </>
            )}
          </span>
        </div>
      ) : (
        <>
          <FormResenha
            userId={userId}
            livroId={livro.id}
            tituloDoLivro={livro.titulo}
            resenhaExistente={minhaResenha}
          />
          <ListaResenhas
            resenhas={resenhas}
            membrosPorId={membrosPorId}
            comentariosPorAlvo={comentariosPorAlvo}
            meuUserId={userId}
            foco={foco}
          />
        </>
      )}
    </section>
  )
}

export default ResenhasDoLivro

export function SeloDaSituacao({ situacao }) {
  if (situacao === 'atual') {
    return <span className="resenha-selo selo-atual">Lendo agora</span>
  }
  if (situacao === 'fila') {
    return <span className="resenha-selo selo-fila">Na fila</span>
  }
  return null
}

export function Estrelas({ valor, onChange, leitura = false }) {
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

function FormResenha({ userId, livroId, tituloDoLivro, resenhaExistente }) {
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
      // Só a primeira versão avisa o clube. Reescrever a própria resenha é
      // comum e não é novidade para ninguém.
      if (!resenhaExistente) {
        anunciar(`resenha-${userId}_${livroId}`, textoDaResenha(meuNome(), tituloDoLivro))
      }
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

function ListaResenhas({ resenhas, membrosPorId, comentariosPorAlvo, meuUserId, foco }) {
  const verFoto = useVerFoto()
  const emFoco = useFoco(foco, 'resenha')
  const ordenadas = [...resenhas].sort(
    (a, b) => (b.atualizadoEm?.seconds || 0) - (a.atualizadoEm?.seconds || 0)
  )

  if (!ordenadas.length) {
    return (
      <p className="texto-suave" style={{ marginTop: '1rem' }}>
        Ninguém publicou resenha deste livro ainda. Seja o primeiro!
      </p>
    )
  }

  return (
    <div className="resenhas-lista">
      {ordenadas.map((r) => {
        const autor = membrosPorId[r.userId]
        const souAutor = r.userId === meuUserId
        return (
          <article
            id={`foco-resenha-${r.id}`}
            className={`resenha-item${emFoco === r.id ? ' em-foco' : ''}`}
            key={r.id}
          >
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
              {souAutor && <span className="nota-tag">sua resenha</span>}
              {r.nota > 0 && <Estrelas valor={r.nota} leitura />}
              <span className="nota-quando">{formatarData(r.atualizadoEm)}</span>
            </div>
            <div className="nota-texto">{r.texto}</div>
            <Comentarios
              alvoTipo="resenha"
              alvoId={r.id}
              comentarios={comentariosPorAlvo[r.id] || []}
              membrosPorId={membrosPorId}
              userId={meuUserId}
              abrirEm={
                foco?.tipo === 'resenha' && foco.id === r.id && foco.comentarios
                  ? foco.marca
                  : null
              }
            />
          </article>
        )
      })}
    </div>
  )
}
