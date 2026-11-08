import { useMemo } from 'react'
import { formatarData, inicial } from '../lib/formato'
import { corDoMembro } from '../lib/cores'
import { rotuloSerie } from '../lib/series'
import { estatisticasDoPato, diasPorExtenso } from '../lib/estatisticas'
import { IconePato, IconeCoroa, IconeLivro, IconeLivroAberto, IconePena, IconePilha, IconeSeta, IconeTrofeu } from './Icones'
import { useVerFoto } from './FotoContext'

// Os patos: quem lê na Patoteca, e o que a leitura de cada um conta.
//
// A lista é o ranking do clube — quem mais terminou em primeiro, quem mais
// terminou. Abrir um pato mostra o perfil dele: desde quando está aqui, o
// que está lendo agora, quanto tempo leva por livro, se costuma começar
// cedo ou tarde, o ritmo — e a estante do que ele já leu, com a nota e a
// resenha de cada um.
//
// As contas saem do progresso gravado. O "quando começou" de cada livro só
// é exato para o que foi marcado depois de o campo existir; antes disso vale
// a marcação mais antiga que sobrou na trilha, e a tela avisa.
export default function Patos({
  userId,
  membros = [],
  membrosPorId = {},
  livros = [],
  progressoPorLivro = {},
  resenhasPorLivro = {},
  patoId = '',
  aoAbrir,
  aoFechar,
  aoEditarPerfil,
  aoVerResenhas,
  aoVerLivro,
}) {
  const verFoto = useVerFoto()

  const patos = useMemo(
    () =>
      membros
        .map((membro) => ({
          membro,
          cor: corDoMembro(membro),
          stats: estatisticasDoPato(membro.id, { livros, porLivro: progressoPorLivro, membros }),
        }))
        .sort(
          (a, b) =>
            b.stats.vitorias - a.stats.vitorias ||
            b.stats.quantosTerminados - a.stats.quantosTerminados ||
            (b.stats.ultimaAtividade || 0) - (a.stats.ultimaAtividade || 0) ||
            (a.membro.nome || '').localeCompare(b.membro.nome || '')
        ),
    [membros, livros, progressoPorLivro]
  )

  const aberto = patos.find((p) => p.membro.id === patoId) || null

  if (aberto) {
    return (
      <PerfilDoPato
        pato={aberto}
        souEu={aberto.membro.id === userId}
        membrosPorId={membrosPorId}
        resenhasPorLivro={resenhasPorLivro}
        aoVoltar={aoFechar}
        aoEditarPerfil={aoEditarPerfil}
        aoVerResenhas={aoVerResenhas}
        aoVerLivro={aoVerLivro}
      />
    )
  }

  if (!patos.length) {
    return (
      <section className="painel centro estante-pessoal-vazia">
        <div className="selo-secao" style={{ justifyContent: 'center' }}>
          <IconePato size={40} />
        </div>
        <p className="texto-suave">Nenhum pato no lago ainda.</p>
      </section>
    )
  }

  return (
    <section className="painel">
      <h2 className="secao-titulo">
        <IconePato size={22} /> Os patos
      </h2>
      <p className="texto-suave centro" style={{ marginTop: 0 }}>
        {patos.length === 1 ? '1 leitor' : `${patos.length} leitores`} na Patoteca, do
        mais vitorioso ao mais recém-chegado. Toque num pato para ver as contas dele.
      </p>

      <ul className="patos-lista">
        {patos.map(({ membro, cor, stats }, i) => {
          const souEu = membro.id === userId
          const lendo = stats.lendo[0]
          return (
            <li key={membro.id}>
              <button
                type="button"
                className={`pato-item${souEu ? ' eu' : ''}`}
                onClick={() => aoAbrir(membro.id)}
                style={{ '--cor-membro': cor }}
              >
                <span className="pato-posicao" aria-hidden="true">
                  {i + 1}º
                </span>
                {membro.avatarUrl ? (
                  <img className="pato-avatar" src={membro.avatarUrl} alt="" />
                ) : (
                  <span className="pato-avatar pato-inicial">{inicial(membro.nome)}</span>
                )}
                <span className="pato-dados">
                  <span className="pato-nome">
                    {membro.nome}
                    {souEu && <em className="fila-eu"> (você)</em>}
                  </span>
                  <span className="pato-meta">
                    {lendo ? (
                      <>
                        lendo <strong>{lendo.livro.titulo}</strong> · {lendo.pct}%
                      </>
                    ) : stats.adiantando.length ? (
                      <>
                        adiantando <strong>{stats.adiantando[0].livro.titulo}</strong> ·{' '}
                        {stats.adiantando[0].pct}%
                      </>
                    ) : stats.quantosTerminados ? (
                      'entre um livro e outro'
                    ) : (
                      'ainda não marcou progresso'
                    )}
                  </span>
                </span>
                <span className="pato-numeros">
                  <span title="Livros terminados">
                    <IconePilha size={15} /> {stats.quantosTerminados}
                  </span>
                  <span title="Vezes que terminou em primeiro">
                    <IconeCoroa size={15} /> {stats.vitorias}
                  </span>
                </span>
                <IconeSeta size={16} className="pato-seta" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---------- O perfil ----------

function PerfilDoPato({
  pato,
  souEu,
  membrosPorId,
  resenhasPorLivro,
  aoVoltar,
  aoEditarPerfil,
  aoVerResenhas,
  aoVerLivro,
}) {
  const verFoto = useVerFoto()
  const { membro, cor, stats } = pato

  // Há livros em que não sabemos quando a pessoa começou (progresso anterior
  // ao campo): as médias de tempo saem do que dá para medir, e dizemos isso.
  const semComeco = stats.livros.filter((l) => l.comecou == null).length

  const terminados = [...stats.terminados].sort((a, b) => (b.terminou || 0) - (a.terminou || 0))

  return (
    <section className="painel perfil-pato" style={{ '--cor-membro': cor }}>
      <button type="button" className="btn-texto voltar-prateleira" onClick={aoVoltar}>
        <IconeSeta size={16} aria-hidden="true" />
        Todos os patos
      </button>

      <div className="perfil-topo">
        {membro.avatarUrl ? (
          <img
            className="perfil-avatar avatar-clicavel"
            src={membro.avatarUrl}
            alt={membro.nome}
            onClick={() => verFoto(membro.avatarUrl, membro.nome)}
          />
        ) : (
          <span className="perfil-avatar perfil-inicial">{inicial(membro.nome)}</span>
        )}
        <div className="perfil-dados">
          <h3>
            {membro.nome}
            {souEu && <em className="fila-eu"> (você)</em>}
          </h3>
          <div className="lido-meta">
            {membro.criadoEm
              ? `Na Patoteca desde ${formatarData(membro.criadoEm)}`
              : 'Na Patoteca desde o começo'}
          </div>
          {souEu && aoEditarPerfil && (
            <button type="button" className="btn-texto" onClick={aoEditarPerfil}>
              <IconePena size={14} /> Editar perfil
            </button>
          )}
        </div>
      </div>

      <dl className="perfil-stats">
        <Stat
          Icone={IconePilha}
          rotulo="Livros terminados"
          valor={stats.quantosTerminados}
        />
        <Stat
          Icone={IconeTrofeu}
          rotulo="Terminou em primeiro"
          valor={stats.vitorias}
          detalhe={stats.vitorias === 1 ? 'vez' : 'vezes'}
        />
        <Stat
          Icone={IconeLivroAberto}
          rotulo="Lendo agora"
          valor={
            stats.lendo.length
              ? stats.lendo.map((l) => `${l.livro.titulo} (${l.pct}%)`).join(' · ')
              : stats.adiantando.length
                ? `${stats.adiantando[0].livro.titulo} (${stats.adiantando[0].pct}%, da fila)`
                : '—'
          }
          texto
        />
        <Stat
          Icone={IconeLivro}
          rotulo="Tempo por livro"
          valor={stats.mediaDiasParaTerminar != null ? diasPorExtenso(stats.mediaDiasParaTerminar) : '—'}
          detalhe={stats.mediaDiasParaTerminar != null ? 'em média, do começo ao fim' : 'ainda sem livro medido'}
          texto
        />
        <Stat
          Icone={IconeSeta}
          rotulo="Costuma começar"
          valor={
            stats.atrasoMedio == null
              ? '—'
              : Math.abs(stats.atrasoMedio) < 1
                ? 'junto com o clube'
                : stats.atrasoMedio > 0
                  ? `${diasPorExtenso(stats.atrasoMedio)} depois`
                  : `${diasPorExtenso(stats.atrasoMedio)} antes`
          }
          detalhe={stats.atrasoMedio != null ? 'do clube abrir o livro' : ''}
          texto
        />
        <Stat
          Icone={IconeCoroa}
          rotulo="Ritmo"
          valor={stats.ritmoMedio != null ? `${stats.ritmoMedio.toFixed(1)}% por dia` : '—'}
          detalhe={
            stats.ritmoMedio != null && stats.ritmoMedio > 0
              ? `um livro a cada ${diasPorExtenso(100 / stats.ritmoMedio)}`
              : ''
          }
          texto
        />
      </dl>

      {semComeco > 0 && (
        <p className="texto-tenue perfil-aviso">
          {semComeco === 1
            ? 'Em 1 livro não dá para saber quando a leitura começou'
            : `Em ${semComeco} livros não dá para saber quando a leitura começou`}{' '}
          (progresso anterior a este registro) — tempo, ritmo e "costuma começar"
          saem só do que dá para medir.
        </p>
      )}

      <h3 className="perfil-subtitulo">
        <IconePilha size={18} />{' '}
        {souEu ? 'Livros que você já leu' : `Livros que ${membro.nome} já leu`}
      </h3>

      {!terminados.length ? (
        <p className="texto-suave" style={{ marginTop: 0 }}>
          {souEu
            ? 'Sua estante ainda está vazia. Assim que você cruzar os 100% de um livro do clube, ele aparece aqui — com a data em que você terminou e a sua resenha.'
            : 'Ainda nenhum livro terminado.'}
        </p>
      ) : (
        <div className="estante-pessoal-lista">
          {terminados.map(({ livro, terminou, posicao, venceu }) => {
            const resenha = (resenhasPorLivro[livro.id] || []).find((r) => r.userId === membro.id)
            const serie = rotuloSerie(livro)
            const quando = terminou ? formatarData(new Date(terminou)) : ''
            return (
              <article className="lido-item" key={livro.id}>
                {livro.capaUrl ? (
                  <img className="capinha" src={livro.capaUrl} alt={`Capa de ${livro.titulo}`} />
                ) : (
                  <div className="capinha capinha-vazia">
                    <IconeLivro size={18} />
                  </div>
                )}
                <div className="lido-dados">
                  {serie && <div className="livro-serie">{serie}</div>}
                  <h4>{livro.titulo}</h4>
                  {livro.autor && <div className="autor">{livro.autor}</div>}
                  <div className="lido-meta">
                    {quando ? `Terminou ${quando}` : 'Terminado'}
                    {posicao ? ` · ${posicao}º a terminar` : ''}
                  </div>
                  <div className="lido-selos">
                    {venceu && (
                      <span className="resenha-selo selo-atual">
                        <IconeCoroa size={12} /> Primeiro a terminar
                      </span>
                    )}
                    {livro.ativo === true && (
                      <span className="resenha-selo selo-atual">Livro do clube agora</span>
                    )}
                    {livro.naFila === true && <span className="resenha-selo selo-fila">Na fila</span>}
                    {resenha?.nota > 0 && (
                      <span className="lido-nota" aria-label={`Nota: ${resenha.nota} de 5`}>
                        {'★'.repeat(Math.min(5, resenha.nota))}
                        <span className="lido-nota-vazia">
                          {'★'.repeat(Math.max(0, 5 - resenha.nota))}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="lido-acao lido-acoes-pato">
                  <button className="btn btn-fantasma" onClick={() => aoVerResenhas(livro.id)}>
                    <IconePena size={16} />
                    {resenha ? (souEu ? 'Ver sua resenha' : 'Ver a resenha') : souEu ? 'Resenhar' : 'Resenhas'}
                  </button>
                  <button className="btn-texto" onClick={() => aoVerLivro(livro.id)}>
                    <IconeLivroAberto size={14} /> Ver a corrida
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Stat({ Icone, rotulo, valor, detalhe = '', texto = false }) {
  return (
    <div className={`perfil-stat${texto ? ' perfil-stat-texto' : ''}`}>
      <dt>
        <Icone size={15} /> {rotulo}
      </dt>
      <dd>
        <span className="perfil-stat-valor">{valor}</span>
        {detalhe && <span className="perfil-stat-detalhe">{detalhe}</span>}
      </dd>
    </div>
  )
}
