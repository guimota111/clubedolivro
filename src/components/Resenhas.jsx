import { useEffect, useMemo, useState } from 'react'
import { useFoco } from '../hooks/useFoco'
import { salvarResenha } from '../lib/db'
import { anunciar, meuNome } from '../lib/push'
import { textoDaResenha } from '../lib/atividades'
import { pctDoProgresso, formatarData, inicial } from '../lib/formato'
import { rotuloSerie } from '../lib/series'
import {
  IconeLivro,
  IconePena,
  IconeLivroAberto,
  IconeCadeado,
  IconeSeta,
} from './Icones'
import { useVerFoto } from './FotoContext'
import Comentarios from './Comentarios'

// Aba de Resenhas, em dois andares.
//
// A PRATELEIRA mostra as capas de todos os livros do clube. Quem terminou um
// livro entra nele; quem não terminou vê o cadeado e o quanto falta.
//
// Escolhido um livro, a tela vira SÓ dele: o formulário e as resenhas daquele
// título. Uma lista única com tudo junto ficava confusa — as resenhas de três
// livros diferentes, uma embaixo da outra, sem que ninguém tivesse pedido para
// ler nenhuma delas.
export default function Resenhas({
  userId,
  livrosAtuais = [],
  proximo,
  historico,
  meuProgressoPorLivro,
  resenhasPorLivro,
  comentariosPorAlvo,
  membrosPorId,
  foco,
}) {
  // Monta a lista de livros "resenhaveis": os em leitura + fila + histórico
  // (sem duplicar). O da fila entra porque quem já o terminou tem o que dizer,
  // mesmo antes de ele virar o livro oficial do clube.
  const livros = useMemo(() => {
    const lista = []
    const vistos = new Set()
    const juntar = (livro, situacao) => {
      if (!livro || vistos.has(livro.id)) return
      vistos.add(livro.id)
      lista.push({
        id: livro.id,
        titulo: livro.titulo,
        autor: livro.autor,
        capaUrl: livro.capaUrl,
        totalPaginas: livro.totalPaginas,
        serie: rotuloSerie(livro),
        situacao,
      })
    }
    livrosAtuais.forEach((l) => juntar(l, 'atual'))
    juntar(proximo, 'fila')
    historico.forEach((h) => juntar(h, 'encerrado'))
    return lista
  }, [livrosAtuais, proximo, historico])

  const [escolhidoId, setEscolhidoId] = useState(null)

  // Quem chega por um aviso ou pela estante já vem com um livro em mente: a
  // prateleira sai da frente e a tela abre direto nele. `livroId` acompanha
  // todo destino que aponta para cá (ver `lib/atividades.js`); um destino
  // antigo, sem ele, ao menos abre a prateleira.
  useEffect(() => {
    if (!foco || foco.aba !== 'resenhas') return
    const alvo = foco.tipo === 'livro' ? foco.id : foco.livroId
    if (alvo) setEscolhidoId(alvo)
  }, [foco])

  // O livro escolhido pode sair do ar (o clube reabriu um volume, por exemplo).
  // Aí a prateleira volta, em vez de a tela ficar em branco.
  const escolhido = livros.find((l) => l.id === escolhidoId) || null

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

  if (escolhido) {
    return (
      <LivroEscolhido
        livro={escolhido}
        userId={userId}
        minhaPct={pctDoProgresso(
          meuProgressoPorLivro[escolhido.id],
          escolhido.totalPaginas || 0
        )}
        resenhas={resenhasPorLivro[escolhido.id] || []}
        comentariosPorAlvo={comentariosPorAlvo}
        membrosPorId={membrosPorId}
        foco={foco}
        aoVoltar={() => setEscolhidoId(null)}
      />
    )
  }

  return (
    <section className="painel estante-resenhas">
      <h2 className="secao-titulo">
        <IconePena size={22} /> Resenhas
      </h2>
      <p className="texto-suave" style={{ marginTop: 0 }}>
        Escolha um livro para ler e escrever as resenhas dele. Cada um abre
        quando você chega ao fim — assim ninguém tropeça em spoiler.
      </p>

      <div className="estante-resenhas-capas">
        {livros.map((livro) => (
          <CapaNaPrateleira
            key={livro.id}
            livro={livro}
            userId={userId}
            minhaPct={pctDoProgresso(
              meuProgressoPorLivro[livro.id],
              livro.totalPaginas || 0
            )}
            resenhas={resenhasPorLivro[livro.id] || []}
            aoEscolher={() => setEscolhidoId(livro.id)}
          />
        ))}
      </div>
    </section>
  )
}

// ---------- A prateleira ----------

function Capa({ livro }) {
  return livro.capaUrl ? (
    <img src={livro.capaUrl} alt={`Capa de ${livro.titulo}`} />
  ) : (
    <div className="capa-sem-imagem">
      <IconeLivro size={28} />
    </div>
  )
}

function SeloDaSituacao({ situacao }) {
  if (situacao === 'atual') {
    return <span className="resenha-selo selo-atual">Lendo agora</span>
  }
  if (situacao === 'fila') {
    return <span className="resenha-selo selo-fila">Na fila</span>
  }
  return null
}

function CapaNaPrateleira({ livro, userId, minhaPct, resenhas, aoEscolher }) {
  const terminei = minhaPct >= 100
  const minhaResenha = resenhas.find((r) => r.userId === userId)

  const legenda = (
    <div className="capa-legenda">
      {livro.serie && <div className="livro-serie">{livro.serie}</div>}
      <strong className="capa-titulo">{livro.titulo}</strong>
      {livro.autor && <div className="autor capa-autor">{livro.autor}</div>}
      <SeloDaSituacao situacao={livro.situacao} />
      <div className="capa-meta">
        {!terminei ? (
          `Abre aos 100% — você está em ${minhaPct}%`
        ) : resenhas.length === 0 ? (
          'Ninguém resenhou ainda'
        ) : (
          <>
            {resenhas.length === 1 ? '1 resenha' : `${resenhas.length} resenhas`}
            {minhaResenha && <span className="capa-minha"> · a sua está lá</span>}
          </>
        )}
      </div>
    </div>
  )

  // Livro trancado não é botão: um botão desativado não responde ao toque e
  // deixa a pessoa achando que a tela travou. O cadeado e a porcentagem já
  // dizem o que está acontecendo e o que falta.
  if (!terminei) {
    return (
      <div className="capa-item capa-trancada">
        <div className="capa-moldura">
          <Capa livro={livro} />
          <div className="capa-tranca">
            <IconeCadeado size={26} />
            <span>{minhaPct}%</span>
          </div>
        </div>
        {legenda}
      </div>
    )
  }

  return (
    <button type="button" className="capa-item" onClick={aoEscolher}>
      <div className="capa-moldura">
        <Capa livro={livro} />
      </div>
      {legenda}
    </button>
  )
}

// ---------- O livro escolhido ----------

function LivroEscolhido({
  livro,
  userId,
  minhaPct,
  resenhas,
  comentariosPorAlvo,
  membrosPorId,
  foco,
  aoVoltar,
}) {
  const minhaResenha = resenhas.find((r) => r.userId === userId)
  const terminei = minhaPct >= 100

  return (
    <section className="painel resenha-livro">
      <button type="button" className="btn-texto voltar-prateleira" onClick={aoVoltar}>
        <IconeSeta size={16} aria-hidden="true" />
        Todos os livros
      </button>

      <div className="resenha-livro-topo">
        {livro.capaUrl ? (
          <img className="capinha" src={livro.capaUrl} alt={`Capa de ${livro.titulo}`} />
        ) : (
          <div className="capinha capinha-vazia">
            <IconeLivro size={20} />
          </div>
        )}
        <div>
          {livro.serie && <div className="livro-serie">{livro.serie}</div>}
          <h3 style={{ margin: 0 }}>{livro.titulo}</h3>
          {livro.autor && <div className="autor">{livro.autor}</div>}
          <SeloDaSituacao situacao={livro.situacao} />
        </div>
      </div>

      {!terminei ? (
        <div className="resenha-trancada">
          <IconeLivroAberto size={20} />
          <span>
            As resenhas deste livro liberam quando você termina (100%). Você está
            em {minhaPct}%.
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
        anunciar(
          `resenha-${userId}_${livroId}`,
          textoDaResenha(meuNome(), tituloDoLivro)
        )
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
