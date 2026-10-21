import { useEffect, useMemo, useState } from 'react'
import { useVotos } from '../hooks/useDadosClube'
import { votar, cancelarEleicao } from '../lib/db'
import { formatarData, prazoParaData, contagemRegressiva, inicial } from '../lib/formato'
import { rotuloSerie } from '../lib/series'
import {
  INDICACOES_POR_PESSOA,
  votosPorPessoa,
  separarEleicoes,
  indicacoesAbertas,
  votacaoAberta,
  indicacoesEmDisputa,
  embaralharFixo,
  contarVotantes,
  listarTitulos,
} from '../lib/eleicao'
import IndicarLivroModal from './IndicarLivroModal'
import ApuracaoModal from './ApuracaoModal'
import SenhaUrnaModal from './SenhaUrnaModal'
import {
  IconeUrna,
  IconeLivro,
  IconeCoroa,
  IconeCadeado,
  IconePena,
  IconeSeta,
  IconeMais,
} from './Icones'

// A aba da eleição do próximo livro.
//
// Com uma eleição aberta, a tela é uma prateleira com as capas dos livros
// indicados — sem nome de quem indicou e sem contagem de votos. Tocar numa
// capa abre o livro: a defesa escrita por quem o indicou e o botão de votar.
// A urna (apurar, novo turno, cancelar) pede a senha.
//
// Sem eleição aberta, a tela mostra a última encerrada — com tudo revelado —
// e as anteriores, recolhidas.
export default function Eleicao({
  userId,
  eleicoes = [],
  indicacoes = [],
  membros = [],
  membrosPorId = {},
  livrosAtuais = [],
  historico = [],
  seriesConhecidas = [],
  foco,
  aoAbrirEleicao,
  aoLivroEleito,
}) {
  const { atual, passadas } = useMemo(() => separarEleicoes(eleicoes), [eleicoes])
  const { votos } = useVotos(atual?.id)

  const [escolhidaId, setEscolhidaId] = useState(null)
  const [modalIndicar, setModalIndicar] = useState(null) // null | { indicacao? }
  const [modalApuracao, setModalApuracao] = useState(false)
  const [modalCancelar, setModalCancelar] = useState(false)
  const [passadaAberta, setPassadaAberta] = useState(null)
  const [erroVoto, setErroVoto] = useState('')
  const [votando, setVotando] = useState(false)

  // Um aviso de novidades aponta para uma indicação ou para uma eleição: abre
  // o livro, se ele está na disputa de agora, ou a eleição passada a que ele
  // pertence.
  useEffect(() => {
    if (!foco || foco.aba !== 'eleicao') return
    if (foco.tipo === 'indicacao') {
      const ind = indicacoes.find((i) => i.id === foco.id)
      if (!ind) return
      if (atual && ind.eleicaoId === atual.id) setEscolhidaId(ind.id)
      else setPassadaAberta(ind.eleicaoId)
    } else if (foco.tipo === 'eleicao') {
      if (!atual || foco.id !== atual.id) setPassadaAberta(foco.id)
      setEscolhidaId(null)
    }
  }, [foco]) // eslint-disable-line react-hooks/exhaustive-deps

  const daEleicao = useMemo(
    () => (atual ? indicacoes.filter((i) => i.eleicaoId === atual.id) : []),
    [indicacoes, atual]
  )
  const emDisputa = useMemo(() => indicacoesEmDisputa(atual, indicacoes), [atual, indicacoes])
  const prateleira = useMemo(
    () => (atual ? embaralharFixo(emDisputa, atual.id) : []),
    [emDisputa, atual]
  )
  const minhas = daEleicao.filter((i) => i.userId === userId)

  const turno = atual?.turno || 1
  const limiteVotos = votosPorPessoa(turno)
  const idsEmDisputa = useMemo(() => new Set(emDisputa.map((i) => i.id)), [emDisputa])
  const meuVoto = votos.find((v) => v.userId === userId && (v.turno || 1) === turno)
  const meusVotos = (meuVoto?.indicacoes || []).filter((id) => idsEmDisputa.has(id))
  const votantes = contarVotantes(votos, atual, indicacoes)

  const podeIndicar = indicacoesAbertas(atual) && minhas.length < INDICACOES_POR_PESSOA
  const podeVotar = votacaoAberta(atual)

  // Títulos que o clube já leu (ou está lendo), para avisar quem indicar um
  // livro repetido.
  const titulosJaLidos = useMemo(
    () => [...historico.map((h) => h.titulo), ...livrosAtuais.map((l) => l.titulo)],
    [historico, livrosAtuais]
  )

  async function alternarVoto(indicacaoId) {
    if (!atual || !podeVotar) return
    const tem = meusVotos.includes(indicacaoId)
    const novos = tem ? meusVotos.filter((id) => id !== indicacaoId) : [...meusVotos, indicacaoId]
    if (novos.length > limiteVotos) {
      setErroVoto(
        limiteVotos === 1
          ? 'Neste turno é um voto só. Retire o voto atual para trocar.'
          : `Você já usou seus ${limiteVotos} votos. Retire um para trocar.`
      )
      return
    }
    setErroVoto('')
    setVotando(true)
    try {
      await votar(userId, atual.id, turno, novos)
    } catch (err) {
      console.error(err)
      setErroVoto('Não foi possível registrar o voto. Tente novamente.')
    } finally {
      setVotando(false)
    }
  }

  const escolhida = atual ? emDisputa.find((i) => i.id === escolhidaId) || null : null

  // ---------- Sem eleição aberta ----------

  if (!atual) {
    return (
      <>
        <section className="painel eleicao-vazia">
          <h2 className="secao-titulo">
            <IconeUrna size={22} /> Eleição do próximo livro
          </h2>
          <p className="texto-suave" style={{ marginTop: 0 }}>
            Nenhuma eleição aberta agora. Quando chegar a hora de escolher o
            próximo livro, quem tem a senha da urna abre uma por aqui.
          </p>
          <button className="btn" onClick={aoAbrirEleicao}>
            <IconeUrna size={18} />
            Abrir uma eleição
          </button>
        </section>
        <EleicoesPassadas
          eleicoes={passadas}
          indicacoes={indicacoes}
          membrosPorId={membrosPorId}
          aberta={passadaAberta ?? passadas[0]?.id ?? null}
          aoAbrir={setPassadaAberta}
        />
      </>
    )
  }

  // ---------- Um livro escolhido ----------

  if (escolhida) {
    return (
      <LivroIndicado
        indicacao={escolhida}
        minha={escolhida.userId === userId}
        votei={meusVotos.includes(escolhida.id)}
        podeVotar={podeVotar}
        podeCorrigir={indicacoesAbertas(atual)}
        votosRestantes={limiteVotos - meusVotos.length}
        votando={votando}
        erro={erroVoto}
        aoVotar={() => alternarVoto(escolhida.id)}
        aoCorrigir={() => setModalIndicar({ indicacao: escolhida })}
        aoVoltar={() => {
          setErroVoto('')
          setEscolhidaId(null)
        }}
        modal={
          modalIndicar && (
            <IndicarLivroModal
              userId={userId}
              eleicao={atual}
              indicacoes={daEleicao}
              indicacaoExistente={modalIndicar.indicacao || null}
              titulosJaLidos={titulosJaLidos}
              seriesConhecidas={seriesConhecidas}
              onFechar={() => setModalIndicar(null)}
            />
          )
        }
      />
    )
  }

  // ---------- A prateleira ----------

  const empatada = atual.status === 'empatada'
  const registroEmpate = empatada
    ? (atual.apuracoes || []).find((a) => a.turno === turno)
    : null
  const empatados = registroEmpate
    ? daEleicao.filter((i) => (registroEmpate.empatados || []).includes(i.id))
    : []

  return (
    <>
      <section className="painel eleicao">
        <h2 className="secao-titulo">
          <IconeUrna size={22} /> {atual.nome || 'Eleição do próximo livro'}
        </h2>
        <p className="eleicao-status">
          {empatada ? (
            <>Apuração com empate — à espera do desempate</>
          ) : turno > 1 ? (
            <>
              {turno}º turno · desempate entre {emDisputa.length} livros ·{' '}
              {limiteVotos} voto por pessoa
            </>
          ) : (
            <>
              Indicações e votação abertas · até {INDICACOES_POR_PESSOA} indicações e{' '}
              {limiteVotos} votos por pessoa
            </>
          )}
        </p>

        <Prazos eleicao={atual} />

        <div className="eleicao-resumo">
          <span>
            <strong>{emDisputa.length}</strong>{' '}
            {turno > 1
              ? emDisputa.length === 1 ? 'finalista' : 'finalistas'
              : emDisputa.length === 1 ? 'livro indicado' : 'livros indicados'}
          </span>
          <span>
            <strong>{votantes}</strong> de {membros.length} já votaram
          </span>
          <span>
            Você: {minhas.length} de {INDICACOES_POR_PESSOA} indicações ·{' '}
            {meusVotos.length} de {limiteVotos} {limiteVotos === 1 ? 'voto' : 'votos'}
          </span>
        </div>

        <p className="texto-tenue eleicao-segredo">
          Ninguém vê quem indicou o quê nem quantos votos cada livro tem — isso
          só aparece na apuração. Toque numa capa para ler a defesa e votar. Dá
          para mudar o voto até lá.
        </p>

        {empatada && (
          <div className="aviso aviso-bom">
            A apuração deu <strong>empate</strong> entre {listarTitulos(empatados)}.
            Quem tem a senha da urna decide: um novo turno só entre eles, ou o
            desempate na conversa.
          </div>
        )}

        <div className="eleicao-acoes">
          {podeIndicar && (
            <button className="btn" onClick={() => setModalIndicar({})}>
              <IconeMais size={16} />
              Indicar um livro
            </button>
          )}
          {!podeIndicar && turno === 1 && atual.status === 'aberta' && (
            <span className="texto-tenue">
              {minhas.length >= INDICACOES_POR_PESSOA
                ? 'Você já fez suas duas indicações. Para trocar, abra uma delas e retire.'
                : 'O prazo das indicações terminou.'}
            </span>
          )}
          <button className="btn btn-fantasma" onClick={() => setModalApuracao(true)}>
            <IconeCadeado size={16} />
            {empatada ? 'Decidir o empate' : 'Apurar os votos'}
          </button>
        </div>

        {prateleira.length === 0 ? (
          <p className="texto-suave centro" style={{ margin: '1.6rem 0 0.4rem' }}>
            Nenhum livro indicado ainda. Seja a primeira pessoa a colocar um na
            prateleira.
          </p>
        ) : (
          <div className="estante-resenhas-capas eleicao-capas">
            {prateleira.map((ind) => (
              <CapaIndicada
                key={ind.id}
                indicacao={ind}
                minha={ind.userId === userId}
                votei={meusVotos.includes(ind.id)}
                aoEscolher={() => setEscolhidaId(ind.id)}
              />
            ))}
          </div>
        )}

        <div className="centro" style={{ marginTop: '1.4rem' }}>
          <button className="btn-texto" onClick={() => setModalCancelar(true)}>
            Cancelar esta eleição
          </button>
        </div>
      </section>

      <EleicoesPassadas
        eleicoes={passadas}
        indicacoes={indicacoes}
        membrosPorId={membrosPorId}
        aberta={passadaAberta}
        aoAbrir={setPassadaAberta}
      />

      {modalIndicar && (
        <IndicarLivroModal
          userId={userId}
          eleicao={atual}
          indicacoes={daEleicao}
          indicacaoExistente={modalIndicar.indicacao || null}
          titulosJaLidos={titulosJaLidos}
          seriesConhecidas={seriesConhecidas}
          onFechar={() => setModalIndicar(null)}
        />
      )}

      {modalApuracao && (
        <ApuracaoModal
          eleicao={atual}
          indicacoes={indicacoes}
          votos={votos}
          membrosPorId={membrosPorId}
          livrosAtuais={livrosAtuais}
          onFechar={() => setModalApuracao(false)}
          aoEncerrar={(livroId) => {
            setPassadaAberta(atual.id)
            aoLivroEleito?.(livroId)
          }}
        />
      )}

      {modalCancelar && (
        <SenhaUrnaModal
          titulo="Cancelar a eleição"
          explicacao="A eleição sai de cena sem vencedor. As indicações e os votos ficam guardados, mas não aparecem mais."
          rotuloBotao="Cancelar a eleição"
          onConfirmar={async () => {
            await cancelarEleicao(atual.id)
            setModalCancelar(false)
          }}
          onFechar={() => setModalCancelar(false)}
        />
      )}
    </>
  )
}

// ---------- Prazos ----------

// "Indicações até 25 de outubro · faltam 3 dias". Atualiza a cada minuto; a
// precisão de segundos é do relógio do ciclo, não daqui.
function Prazos({ eleicao }) {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const linhas = [
    { rotulo: 'Indicações', iso: eleicao.prazoIndicacoes, so1: true },
    { rotulo: 'Votação', iso: eleicao.prazoVotacao },
  ].filter((l) => l.iso && !(l.so1 && (eleicao.turno || 1) > 1))
  if (!linhas.length) return null

  return (
    <ul className="eleicao-prazos">
      {linhas.map(({ rotulo, iso }) => {
        const alvo = prazoParaData(iso)
        const c = contagemRegressiva(alvo, agora)
        const data = alvo?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
        return (
          <li key={rotulo} className={c?.vencido ? 'prazo-vencido' : ''}>
            <strong>{rotulo}</strong>{' '}
            {c?.vencido
              ? `encerradas em ${data}`
              : `até ${data} · ${
                  c.dias > 0
                    ? `${c.dias === 1 ? 'falta 1 dia' : `faltam ${c.dias} dias`}`
                    : c.horas > 0
                      ? `faltam ${c.horas} h`
                      : 'é hoje'
                }`}
          </li>
        )
      })}
    </ul>
  )
}

// ---------- Uma capa na prateleira ----------

function Capa({ indicacao }) {
  return indicacao.capaUrl ? (
    <img src={indicacao.capaUrl} alt={`Capa de ${indicacao.titulo}`} />
  ) : (
    <div className="capa-sem-imagem">
      <IconeLivro size={28} />
    </div>
  )
}

function CapaIndicada({ indicacao, minha, votei, aoEscolher }) {
  const serie = rotuloSerie(indicacao)
  return (
    <button type="button" className="capa-item" onClick={aoEscolher}>
      <div className="capa-moldura">
        <Capa indicacao={indicacao} />
        {votei && (
          <span className="capa-voto" title="Você votou neste">
            <IconeUrna size={16} /> seu voto
          </span>
        )}
      </div>
      <div className="capa-legenda">
        {serie && <div className="livro-serie">{serie}</div>}
        <strong className="capa-titulo">{indicacao.titulo}</strong>
        {indicacao.autor && <div className="autor capa-autor">{indicacao.autor}</div>}
        {minha && <span className="resenha-selo selo-minha">Sua indicação</span>}
        <div className="capa-meta">
          {indicacao.totalPaginas ? `${indicacao.totalPaginas} páginas` : 'páginas não informadas'}
          {indicacao.serie ? ' · coleção' : ''}
        </div>
      </div>
    </button>
  )
}

// ---------- O livro aberto ----------

function LivroIndicado({
  indicacao,
  minha,
  votei,
  podeVotar,
  podeCorrigir,
  votosRestantes,
  votando,
  erro,
  aoVotar,
  aoCorrigir,
  aoVoltar,
  modal,
}) {
  const serie = rotuloSerie(indicacao)
  return (
    <section className="painel indicacao-aberta">
      <button type="button" className="btn-texto voltar-prateleira" onClick={aoVoltar}>
        <IconeSeta size={16} aria-hidden="true" />
        Todos os indicados
      </button>

      <div className="indicacao-topo">
        <div className="indicacao-capa-grande">
          <Capa indicacao={indicacao} />
        </div>
        <div>
          {serie && <div className="livro-serie">{serie}</div>}
          <h3 style={{ margin: 0 }}>{indicacao.titulo}</h3>
          {indicacao.autor && <div className="autor">{indicacao.autor}</div>}
          <div className="capa-meta" style={{ marginTop: '0.4rem' }}>
            {indicacao.totalPaginas ? `${indicacao.totalPaginas} páginas` : 'Páginas não informadas'}
          </div>
          {minha && <span className="resenha-selo selo-minha">Sua indicação</span>}
          {indicacao.serie && (
            <p className="texto-tenue indicacao-colecao">
              Faz parte de uma coleção. Se vencer, os próximos livros do clube
              serão os de <strong>{indicacao.serie}</strong>, na ordem.
            </p>
          )}
        </div>
      </div>

      <h4 className="indicacao-defesa-titulo">
        <IconePena size={16} /> Por que ler este livro
      </h4>
      <div className="nota-texto indicacao-texto">{indicacao.texto}</div>

      {erro && <div className="erro">{erro}</div>}

      <div className="indicacao-acoes">
        {minha ? (
          <>
            <span className="texto-tenue">
              Você indicou este livro — por isso não vota nele.
            </span>
            {podeCorrigir && (
              <button className="btn btn-fantasma" onClick={aoCorrigir}>
                <IconePena size={16} />
                Corrigir ou retirar
              </button>
            )}
          </>
        ) : !podeVotar ? (
          <span className="texto-tenue">
            <IconeCadeado size={14} /> A votação não está aberta.
          </span>
        ) : votei ? (
          <>
            <span className="eleicao-votado">
              <IconeUrna size={18} /> Você votou neste livro.
            </span>
            <button className="btn btn-fantasma" onClick={aoVotar} disabled={votando}>
              {votando ? 'Salvando…' : 'Retirar meu voto'}
            </button>
          </>
        ) : (
          <>
            <button className="btn" onClick={aoVotar} disabled={votando}>
              <IconeUrna size={18} />
              {votando ? 'Salvando…' : 'Votar neste livro'}
            </button>
            <span className="texto-tenue">
              {votosRestantes > 0
                ? `Você ainda tem ${votosRestantes} ${votosRestantes === 1 ? 'voto' : 'votos'}.`
                : 'Seus votos já foram dados; votar aqui pede retirar um antes.'}
            </span>
          </>
        )}
      </div>
      {modal}
    </section>
  )
}

// ---------- Eleições passadas ----------

function EleicoesPassadas({ eleicoes, indicacoes, membrosPorId, aberta, aoAbrir }) {
  if (!eleicoes.length) return null
  return (
    <section className="painel eleicoes-passadas">
      <h2 className="secao-titulo">
        <IconeCoroa size={22} /> Eleições anteriores
      </h2>
      <div className="eleicoes-passadas-lista">
        {eleicoes.map((e) => {
          const expandida = aberta === e.id
          const daEleicao = indicacoes.filter((i) => i.eleicaoId === e.id)
          const vencedora = daEleicao.find((i) => i.id === e.vencedorIndicacaoId)
          return (
            <article key={e.id} className={`eleicao-passada${expandida ? ' aberta' : ''}`}>
              <button
                type="button"
                className="eleicao-passada-topo"
                aria-expanded={expandida}
                onClick={() => aoAbrir(expandida ? null : e.id)}
              >
                {vencedora?.capaUrl ? (
                  <img className="capinha" src={vencedora.capaUrl} alt="" />
                ) : (
                  <div className="capinha capinha-vazia">
                    <IconeLivro size={16} />
                  </div>
                )}
                <span className="eleicao-passada-dados">
                  <strong>{e.nome || 'Eleição do próximo livro'}</strong>
                  <span className="texto-tenue">
                    {e.status === 'cancelada'
                      ? `Cancelada ${formatarData(e.encerradaEm)}`
                      : vencedora
                        ? `Venceu “${vencedora.titulo}” · ${formatarData(e.encerradaEm)}`
                        : `Encerrada ${formatarData(e.encerradaEm)}`}
                    {' · '}
                    {daEleicao.length} {daEleicao.length === 1 ? 'indicação' : 'indicações'}
                  </span>
                </span>
                <IconeSeta size={18} className="eleicao-passada-seta" aria-hidden="true" />
              </button>
              {expandida && (
                <Resultado eleicao={e} indicacoes={daEleicao} membrosPorId={membrosPorId} />
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

// O resultado de uma eleição encerrada: turno a turno, com os votos e quem
// indicou cada livro — agora pode. Tocar num livro mostra a defesa dele.
function Resultado({ eleicao, indicacoes, membrosPorId }) {
  const [textoAberto, setTextoAberto] = useState(null)
  const apuracoes = [...(eleicao.apuracoes || [])].sort((a, b) => (a.turno || 1) - (b.turno || 1))
  const porId = Object.fromEntries(indicacoes.map((i) => [i.id, i]))

  if (eleicao.status === 'cancelada') {
    return (
      <div className="resultado">
        <p className="texto-suave">
          Esta eleição foi cancelada antes da apuração. Os livros indicados:
        </p>
        <ul className="resultado-lista">
          {indicacoes.map((i) => (
            <LinhaResultado
              key={i.id}
              indicacao={i}
              aberto={textoAberto === i.id}
              aoAlternar={() => setTextoAberto(textoAberto === i.id ? null : i.id)}
            />
          ))}
        </ul>
      </div>
    )
  }

  // Encerrada na mão, sem nenhuma apuração gravada (não deveria acontecer,
  // mas a tela não pode ficar em branco por isso).
  const blocos = apuracoes.length
    ? apuracoes
    : [{ turno: 1, totais: {}, votantes: 0, empatados: [] }]

  return (
    <div className="resultado">
      {blocos.map((ap, k) => {
        const ultimo = k === blocos.length - 1
        const ids = Object.keys(ap.totais || {})
        const lista = (ids.length ? ids.map((id) => porId[id]).filter(Boolean) : indicacoes).sort(
          (a, b) =>
            (ap.totais?.[b.id] || 0) - (ap.totais?.[a.id] || 0) ||
            a.titulo.localeCompare(b.titulo, 'pt-BR')
        )
        const maior = lista.length ? ap.totais?.[lista[0].id] || 0 : 0
        return (
          <div key={ap.turno || k} className="resultado-turno">
            {blocos.length > 1 && (
              <h4 className="resultado-turno-titulo">
                {ap.turno}º turno
                {!ultimo && (ap.empatados || []).length > 1 ? ' · empate' : ''}
              </h4>
            )}
            <p className="texto-tenue" style={{ margin: '0 0 0.6rem' }}>
              {ap.votantes || 0} {ap.votantes === 1 ? 'pessoa votou' : 'pessoas votaram'}
            </p>
            <ul className="resultado-lista">
              {lista.map((i) => {
                const n = ap.totais?.[i.id] || 0
                const coroado = ultimo && eleicao.vencedorIndicacaoId === i.id
                const autor = membrosPorId[i.userId]
                return (
                  <LinhaResultado
                    key={i.id}
                    indicacao={i}
                    votos={n}
                    maior={maior}
                    coroado={coroado}
                    autor={autor}
                    aberto={textoAberto === i.id}
                    aoAlternar={() => setTextoAberto(textoAberto === i.id ? null : i.id)}
                  />
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function LinhaResultado({ indicacao, votos, maior, coroado, autor, aberto, aoAlternar }) {
  const temVotos = typeof votos === 'number'
  return (
    <li className={`apuracao-item${coroado ? ' apuracao-vencedor' : ''}`}>
      <button type="button" className="resultado-linha" onClick={aoAlternar} aria-expanded={aberto}>
        {indicacao.capaUrl ? (
          <img className="capinha" src={indicacao.capaUrl} alt="" />
        ) : (
          <div className="capinha capinha-vazia">
            <IconeLivro size={16} />
          </div>
        )}
        <span className="apuracao-dados">
          <strong className="apuracao-titulo">
            {coroado && <IconeCoroa size={16} />} {indicacao.titulo}
          </strong>
          {indicacao.autor && <span className="autor">{indicacao.autor}</span>}
          {autor !== undefined && (
            <span className="apuracao-quem">
              indicado por{' '}
              {autor ? (
                <>
                  {autor.avatarUrl ? (
                    <img src={autor.avatarUrl} alt="" className="apuracao-avatar" />
                  ) : (
                    <span className="apuracao-avatar apuracao-inicial">{inicial(autor.nome)}</span>
                  )}
                  {autor.nome}
                </>
              ) : (
                'alguém que já saiu do clube'
              )}
            </span>
          )}
          {temVotos && (
            <span className="apuracao-barra" role="img" aria-label={`${votos} votos`}>
              <span style={{ width: `${maior ? (votos / maior) * 100 : 0}%` }} />
            </span>
          )}
        </span>
        {temVotos && (
          <span className="apuracao-votos">
            {votos}
            <small>{votos === 1 ? 'voto' : 'votos'}</small>
          </span>
        )}
      </button>
      {aberto && <div className="nota-texto indicacao-texto resultado-texto">{indicacao.texto}</div>}
    </li>
  )
}
