import { useMemo, useState } from 'react'
import { formatarData, inicial, pctDoProgresso } from '../lib/formato'
import { rotuloSerie, mesmaSerie, serieEmLeitura } from '../lib/series'
import { estatisticasDoLivro } from '../lib/estatisticas'
import { reabrirLivro } from '../lib/db'
import { IconeLivro, IconeCoroa, IconeLivroAberto, IconePena, IconeUrna, IconeTrofeu } from './Icones'
import { useVerFoto } from './FotoContext'
import { ResenhasDoLivro, SeloDaSituacao } from './Resenhas'

// Todos os livros que passaram pelo clube — os em leitura e os encerrados —
// com o que a corrida de cada um rendeu: quem terminou primeiro, quantos
// terminaram, quantos começaram e pararam, quantos nem abriram. E as
// resenhas de cada um, a um toque.
//
// O vencedor é apurado aqui, do progresso, e não lido do campo gravado no
// fim da rodada: por muito tempo ele foi decidido só pela maior porcentagem,
// e com o clube inteiro em 100% isso empatava todo mundo. Quem vence é quem
// chegou primeiro, e a trilha de marcações sabe disso.
export default function LivrosLidos({
  userId,
  livrosAtuais = [],
  historico = [],
  livros = [],
  membros = [],
  membrosPorId = {},
  progressoPorLivro = {},
  meuProgressoPorLivro = {},
  resenhasPorLivro = {},
  comentariosPorAlvo = {},
  foco,
  livroAbertoId = '',
  aoAbrirResenhas,
  aoFecharResenhas,
  aoVerCorrida,
  aoVerEleicoes = null,
}) {
  const verFoto = useVerFoto()
  const [reabrindo, setReabrindo] = useState('')
  const serieDaCasa = serieEmLeitura(livrosAtuais)

  // Em leitura primeiro, depois os encerrados do mais recente ao mais antigo.
  // Os dados do livro vêm do documento vivo em `livroAtual` (tem
  // `totalPaginas`, `dataInicio`…); o do histórico entra só com a data em
  // que foi encerrado.
  const lista = useMemo(() => {
    const porId = {}
    livros.forEach((l) => {
      porId[l.id] = l
    })
    const vistos = new Set()
    const itens = []
    livrosAtuais.forEach((l) => {
      vistos.add(l.id)
      itens.push({ livro: l, situacao: 'atual', encerradoEm: null })
    })
    historico.forEach((h) => {
      if (vistos.has(h.id)) return
      vistos.add(h.id)
      itens.push({ livro: porId[h.id] || h, situacao: 'encerrado', encerradoEm: h.encerradoEm })
    })
    return itens
  }, [livros, livrosAtuais, historico])

  const aberto = lista.find((i) => i.livro.id === livroAbertoId) || null

  function podeReabrir(livro) {
    if (!livrosAtuais.length) return true
    return !!serieDaCasa && mesmaSerie(livro, { serie: serieDaCasa })
  }

  async function reabrir(livro) {
    const ok = window.confirm(
      `Reabrir “${livro.titulo}”?\n\n` +
        'Ele volta para a leitura do clube e sai do histórico. Progresso, notas ' +
        'e resenhas continuam exatamente como estão.'
    )
    if (!ok) return
    setReabrindo(livro.id)
    try {
      await reabrirLivro(livro.id)
    } catch (err) {
      console.error(err)
      window.alert('Não foi possível reabrir este livro. Tente de novo.')
    } finally {
      setReabrindo('')
    }
  }

  if (aberto) {
    return (
      <ResenhasDoLivro
        livro={aberto.livro}
        situacao={aberto.situacao}
        userId={userId}
        minhaPct={pctDoProgresso(meuProgressoPorLivro[aberto.livro.id], aberto.livro.totalPaginas || 0)}
        resenhas={resenhasPorLivro[aberto.livro.id] || []}
        comentariosPorAlvo={comentariosPorAlvo}
        membrosPorId={membrosPorId}
        foco={foco}
        aoVoltar={aoFecharResenhas}
        mostrarCabecalho
      />
    )
  }

  if (!lista.length) {
    return (
      <section className="painel centro estante-pessoal-vazia">
        <div className="selo-secao" style={{ justifyContent: 'center' }}>
          <IconeLivro size={40} />
        </div>
        <p className="texto-suave">
          Nenhum livro passou pelo clube ainda. Cadastre o primeiro na página do
          livro atual.
        </p>
        {aoVerEleicoes && (
          <button type="button" className="btn-texto" onClick={aoVerEleicoes}>
            <IconeUrna size={14} /> Ver as eleições
          </button>
        )}
      </section>
    )
  }

  return (
    <section className="painel">
      <h2 className="secao-titulo">
        <IconeLivro size={22} /> Livros lidos
      </h2>
      <p className="texto-suave centro" style={{ marginTop: 0 }}>
        {lista.length === 1 ? '1 livro passou' : `${lista.length} livros passaram`} pela
        Patoteca. Em cada um, quem cruzou a linha primeiro e quantos chegaram lá.
      </p>

      <div className="lidos-lista">
        {lista.map(({ livro, situacao, encerradoEm }) => {
          const porUsuario = progressoPorLivro[livro.id] || {}
          const stats = estatisticasDoLivro(livro, porUsuario, membros)
          const vencedorId =
            stats.primeiro?.userId ||
            (stats.vencedor?.pct >= 100 ? stats.vencedor.userId : '') ||
            livro.vencedorUserId ||
            ''
          const vencedor = membrosPorId[vencedorId]
          const resenhas = resenhasPorLivro[livro.id] || []
          const serie = rotuloSerie(livro)
          const minhaPct = pctDoProgresso(meuProgressoPorLivro[livro.id], livro.totalPaginas || 0)
          return (
            <article className="lido-livro" key={livro.id}>
              <div className="lido-livro-topo">
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
                  <div className="lido-meta">
                    {livro.autor ? `${livro.autor} · ` : ''}
                    {situacao === 'encerrado'
                      ? `encerrado ${formatarData(encerradoEm) || 'há pouco'}`
                      : 'em leitura'}
                  </div>
                  <div className="lido-selos">
                    <SeloDaSituacao situacao={situacao} />
                    {minhaPct >= 100 && (
                      <span className="resenha-selo selo-atual">Você terminou</span>
                    )}
                  </div>
                </div>

                {vencedor && (
                  <div
                    className="vencedor lido-vencedor"
                    title={`${situacao === 'encerrado' ? 'Terminou primeiro' : 'Na frente'}: ${vencedor.nome}`}
                  >
                    <IconeCoroa size={18} />
                    {vencedor.avatarUrl ? (
                      <img
                        src={vencedor.avatarUrl}
                        alt={vencedor.nome}
                        className="avatar-clicavel"
                        onClick={() => verFoto(vencedor.avatarUrl, vencedor.nome)}
                      />
                    ) : (
                      <span className="lido-vencedor-inicial">{inicial(vencedor.nome)}</span>
                    )}
                  </div>
                )}
              </div>

              <ul className="lido-stats">
                <li>
                  <IconeTrofeu size={16} />
                  {stats.primeiro ? (
                    <>
                      <strong>{membrosPorId[stats.primeiro.userId]?.nome || 'Alguém'}</strong>{' '}
                      terminou primeiro
                      {stats.primeiro.em ? ` (${formatarData(new Date(stats.primeiro.em))})` : ''}
                    </>
                  ) : (
                    <>Ninguém terminou ainda</>
                  )}
                </li>
                <li>
                  <strong>{stats.quantosTerminaram}</strong>{' '}
                  {stats.quantosTerminaram === 1 ? 'terminou' : 'terminaram'}
                  {' · '}
                  <strong>{stats.quantosComecaram}</strong>{' '}
                  {stats.quantosComecaram === 1 ? 'começou e não terminou' : 'começaram e não terminaram'}
                  {stats.quantosNaoComecaram > 0 && (
                    <>
                      {' · '}
                      <strong>{stats.quantosNaoComecaram}</strong>{' '}
                      {stats.quantosNaoComecaram === 1 ? 'nem começou' : 'nem começaram'}
                    </>
                  )}
                </li>
              </ul>

              <div className="lido-acoes">
                <button className="btn btn-fantasma" onClick={() => aoAbrirResenhas(livro.id)}>
                  <IconePena size={16} />
                  {resenhas.length === 0
                    ? 'Resenhas'
                    : resenhas.length === 1
                      ? '1 resenha'
                      : `${resenhas.length} resenhas`}
                </button>
                <button className="btn btn-fantasma" onClick={() => aoVerCorrida(livro.id, situacao)}>
                  <IconeLivroAberto size={16} />
                  Ver a corrida
                </button>
                {situacao === 'encerrado' && podeReabrir(livro) && (
                  <button
                    type="button"
                    className="btn-texto historico-reabrir"
                    onClick={() => reabrir(livro)}
                    disabled={!!reabrindo}
                  >
                    {reabrindo === livro.id ? 'Reabrindo…' : 'Reabrir'}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {aoVerEleicoes && (
        <div className="centro" style={{ marginTop: '1.2rem' }}>
          <button type="button" className="btn-texto" onClick={aoVerEleicoes}>
            <IconeUrna size={14} /> Ver as eleições anteriores
          </button>
        </div>
      )}
    </section>
  )
}
