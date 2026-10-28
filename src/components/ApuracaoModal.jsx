import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import Confete from './Confete'
import {
  registrarApuracao,
  abrirNovoTurno,
  encerrarEleicaoComEleitos,
} from '../lib/db'
import { anunciar } from '../lib/push'
import { textoNovoTurno, textoResultado } from '../lib/atividades'
import { conferirSenhaDaUrna } from '../lib/urna'
import { inicial } from '../lib/formato'
import { corDoMembro } from '../lib/cores'
import {
  VAGAS_PADRAO,
  VAGAS_MAXIMO,
  apurar,
  classificar,
  cedulas,
  contagemParcial,
  eleitosAnteriores,
  embaralharFixo,
  indicacoesEmDisputa,
  listarTitulos,
  ordinal,
  vagasRestantes,
  votosPorPessoa,
} from '../lib/eleicao'
import {
  somCedula,
  somSubida,
  somTambores,
  somFanfarra,
  somLigado,
  ligarSom,
} from '../lib/som'
import { CampoSenha } from './SenhaUrnaModal'
import { IconeCadeado, IconeCoroa, IconeLivro, IconeSino, IconeUrna } from './Icones'

// A urna se abre aqui, na frente do clube. Primeiro a senha; depois as
// cédulas saem uma a uma — cada uma com o nome de quem votou e o livro — e o
// placar vai se mexendo na tela, com rufar de tambores nas últimas. No fim, o
// pódio: os eleitos (um por vaga) entram na fila do próximo livro, na ordem.
// Empate na beira do corte, quem apura escolhe: um novo turno só entre os
// empatados pelas vagas que faltam, ou o desempate decidido ali na conversa.
//
// Tudo acontece só nesta tela — para o clube ver, quem apura projeta ou
// compartilha a tela. O ponto da revelação fica guardado no navegador: fechar
// sem querer e abrir de novo retoma da mesma cédula.

// Nas últimas cédulas, um rufar de tambores antes de revelar.
const CEDULAS_COM_TAMBORES = 3
const TAMBORES_SEGUNDOS = 1.6
const TAMBORES_FINAL_SEGUNDOS = 2.8
// Altura de cada linha do placar: as linhas são posicionadas à mão para
// deslizarem quando trocam de posição.
const ALTURA_LINHA = 66

export default function ApuracaoModal({
  eleicao,
  indicacoes = [],
  votos = [],
  membrosPorId = {},
  livrosAtuais = [],
  onFechar,
  aoEncerrar,
}) {
  const turno = eleicao.turno || 1
  // Apuração deste turno já gravada (a eleição ficou `empatada` à espera da
  // decisão)? Então não se conta de novo — vale o que foi registrado.
  const registrada = useMemo(
    () => (eleicao.apuracoes || []).find((a) => a.turno === turno) || null,
    [eleicao, turno]
  )
  // Quantos livros esta eleição elege. As eleições abertas antes de existir a
  // escolha não têm o campo: quem apura decide aqui, antes de abrir a urna.
  const vagasFixas = turno > 1 || Number.isInteger(eleicao.vagas) || !!registrada
  const [vagas, setVagas] = useState(() => (vagasFixas ? vagasRestantes(eleicao) : VAGAS_PADRAO))

  const [senha, setSenha] = useState('')
  const [passo, setPasso] = useState('senha') // 'senha' | 'revelacao' | 'resultado'
  const [resultado, setResultado] = useState(null)
  const [escolhaManual, setEscolhaManual] = useState([])
  const [novoPrazo, setNovoPrazo] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')

  const emDisputa = useMemo(() => indicacoesEmDisputa(eleicao, indicacoes), [eleicao, indicacoes])
  const todasCedulas = useMemo(() => cedulas(votos, eleicao, indicacoes), [votos, eleicao, indicacoes])
  const chaveRetomada = `clubedolivro:apuracao:${eleicao.id}:${turno}`

  function apurarTudo() {
    return registrada ? reconstruir(registrada, eleicao, indicacoes) : apurar(votos, eleicao, indicacoes, vagas)
  }

  async function abrirUrna(e) {
    e.preventDefault()
    setOcupado('senha')
    setErro('')
    if (!(await conferirSenhaDaUrna(senha))) {
      setErro('Senha incorreta. A senha da urna fica com quem administra o clube.')
      setOcupado('')
      return
    }
    setOcupado('')
    // Já apurado (empate à espera de decisão) ou sem nenhuma cédula: não há o
    // que revelar, vai direto ao resultado.
    if (registrada || !todasCedulas.length) {
      setResultado(apurarTudo())
      setPasso('resultado')
      return
    }
    setPasso('revelacao')
  }

  function concluirRevelacao() {
    setResultado(apurarTudo())
    setPasso('resultado')
  }

  function esquecerRetomada() {
    try {
      sessionStorage.removeItem(chaveRetomada)
    } catch {
      // sem sessionStorage não havia nada guardado
    }
  }

  // Grava a contagem na eleição, se ainda não foi gravada.
  async function garantirRegistro() {
    if (registrada) return
    await registrarApuracao(eleicao.id, turno, resultado, {
      vagas: vagasFixas ? undefined : vagas,
    })
  }

  // Os livros já eleitos em turnos anteriores, para somar aos deste.
  const eleitosAntes = useMemo(() => {
    const porId = Object.fromEntries(indicacoes.map((i) => [i.id, i]))
    return eleitosAnteriores(eleicao).map((id) => porId[id]).filter(Boolean)
  }, [eleicao, indicacoes])

  async function coroar(lista) {
    const titulos = listarTitulos(lista)
    const ok = window.confirm(
      `Encerrar a eleição com ${titulos}?\n\n` +
        (lista.length > 1
          ? `Os ${lista.length} entram na fila do próximo livro, nessa ordem: `
          : 'Ele entra na fila do próximo livro: ') +
        (livrosAtuais.length
          ? 'o clube continua no que está lendo, quem já terminou pode começar o primeiro da fila, ' +
            'e "Tornar o livro do clube" vira a página quando o clube decidir.'
          : 'como não há livro em leitura, basta promover o primeiro na área do próximo livro.')
    )
    if (!ok) return
    setOcupado('coroar')
    setErro('')
    try {
      await garantirRegistro()
      const livrosIds = await encerrarEleicaoComEleitos(eleicao.id, lista)
      anunciar(
        `resultado-${eleicao.id}`,
        textoResultado(lista.map((i) => ({ titulo: i.titulo, nome: membrosPorId[i.userId]?.nome })))
      )
      esquecerRetomada()
      aoEncerrar?.(livrosIds[0])
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível encerrar a eleição. Tente novamente.')
      setOcupado('')
    }
  }

  async function novoTurno() {
    const finalistas = resultado.empatados
    const restantes = resultado.restantes
    const votosNoTurno = votosPorPessoa(turno + 1, restantes)
    const ok = window.confirm(
      `Abrir o ${turno + 1}º turno entre ${listarTitulos(finalistas)}?\n\n` +
        `${restantes === 1 ? 'Falta 1 vaga' : `Faltam ${restantes} vagas`}. ` +
        `Cada membro terá ${votosNoTurno} ${votosNoTurno === 1 ? 'voto' : 'votos'}. ` +
        'Quem indicou continua sem poder votar no próprio livro.'
    )
    if (!ok) return
    setOcupado('turno')
    setErro('')
    try {
      await garantirRegistro()
      await abrirNovoTurno(
        eleicao.id,
        turno,
        finalistas.map((i) => i.id),
        {
          prazoVotacao: novoPrazo || null,
          eleitos: [...eleitosAntes, ...resultado.eleitos].map((i) => i.id),
        }
      )
      anunciar(
        `apuracao-${eleicao.id}-${turno}`,
        textoNovoTurno(turno + 1, listarTitulos(finalistas))
      )
      esquecerRetomada()
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível abrir o novo turno. Tente novamente.')
      setOcupado('')
    }
  }

  // ---------- A senha ----------

  if (passo === 'senha') {
    return (
      <Modal titulo="Abrir a urna" onFechar={onFechar}>
        <p className="texto-suave" style={{ marginTop: 0 }}>
          {registrada
            ? 'A apuração deste turno deu empate e está à espera de uma decisão. Com a senha, escolha entre um novo turno e o desempate manual.'
            : 'A contagem aparece só depois da senha — ninguém a viu até agora, nem você. As cédulas saem da urna uma a uma, com o nome de quem votou, e o placar vai se mexendo na tela. Compartilhe a tela com o clube antes de abrir.'}
        </p>
        <form onSubmit={abrirUrna}>
          {!registrada && (
            <div className="campo">
              <label>Quantos livros esta eleição elege?</label>
              <div className="apuracao-vagas" role="radiogroup" aria-label="Livros a eleger">
                {Array.from({ length: VAGAS_MAXIMO }, (_, k) => k + 1).map((n) => (
                  <label key={n} className={`campo-caixa${vagas === n ? ' marcada' : ''}`}>
                    <input
                      type="radio"
                      name="vagas"
                      value={n}
                      checked={vagas === n}
                      disabled={vagasFixas}
                      onChange={() => setVagas(n)}
                    />
                    <span>
                      {n} {n === 1 ? 'livro' : 'livros'}
                    </span>
                  </label>
                ))}
              </div>
              <span className="campo-dica">
                {vagasFixas
                  ? turno > 1
                    ? `Este turno disputa ${vagas === 1 ? 'a vaga que falta' : `as ${vagas} vagas que faltam`}.`
                    : 'Definido quando a eleição foi aberta.'
                  : 'Os mais votados entram na fila nessa ordem: o 1º é o próximo livro, o 2º vem atrás dele.'}
              </span>
            </div>
          )}
          <CampoSenha valor={senha} aoMudar={setSenha} id="apuracao-senha" />
          {erro && <div className="erro">{erro}</div>}
          <button className="btn" type="submit" disabled={ocupado === 'senha'} style={{ width: '100%' }}>
            <IconeCadeado size={16} />
            {ocupado === 'senha' ? 'Conferindo…' : 'Abrir a urna'}
          </button>
        </form>
      </Modal>
    )
  }

  // ---------- Voto a voto ----------

  if (passo === 'revelacao') {
    return (
      <Revelacao
        eleicao={eleicao}
        turno={turno}
        vagas={vagas}
        emDisputa={emDisputa}
        todasCedulas={todasCedulas}
        membrosPorId={membrosPorId}
        chaveRetomada={chaveRetomada}
        onFechar={onFechar}
        aoConcluir={concluirRevelacao}
      />
    )
  }

  // ---------- O resultado ----------

  return (
    <ResultadoDaUrna
      eleicao={eleicao}
      turno={turno}
      resultado={resultado}
      eleitosAntes={eleitosAntes}
      membrosPorId={membrosPorId}
      escolhaManual={escolhaManual}
      setEscolhaManual={setEscolhaManual}
      novoPrazo={novoPrazo}
      setNovoPrazo={setNovoPrazo}
      ocupado={ocupado}
      erro={erro}
      onFechar={onFechar}
      aoCoroar={coroar}
      aoNovoTurno={novoTurno}
    />
  )
}

// ---------- A revelação, cédula por cédula ----------

function Revelacao({
  eleicao,
  turno,
  vagas,
  emDisputa,
  todasCedulas,
  membrosPorId,
  chaveRetomada,
  onFechar,
  aoConcluir,
}) {
  const total = todasCedulas.length
  const [reveladas, setReveladas] = useState(() => {
    try {
      const n = Number(sessionStorage.getItem(chaveRetomada))
      return Number.isInteger(n) && n > 0 ? Math.min(n, total) : 0
    } catch {
      return 0
    }
  })
  const [rufando, setRufando] = useState(false)
  const [som, setSom] = useState(somLigado)
  const [piscando, setPiscando] = useState(null) // id do livro que acabou de receber voto
  const temporizador = useRef(null)
  const botao = useRef(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(chaveRetomada, String(reveladas))
    } catch {
      // sem sessionStorage, a retomada só não funciona
    }
  }, [reveladas, chaveRetomada])

  useEffect(() => () => clearTimeout(temporizador.current), [])

  // A ordem "de prateleira" (a mesma embaralhada que o clube viu durante a
  // votação) é o desempate visual: quem tem os mesmos votos fica como estava.
  const prateleira = useMemo(() => embaralharFixo(emDisputa, eleicao.id), [emDisputa, eleicao.id])
  const parcial = useMemo(
    () => contagemParcial(todasCedulas, reveladas, emDisputa),
    [todasCedulas, reveladas, emDisputa]
  )
  const placar = useMemo(() => ordenarPlacar(prateleira, parcial), [prateleira, parcial])
  const situacao = useMemo(
    () => classificar({ emDisputa: prateleira, totais: parcial, vagas }),
    [prateleira, parcial, vagas]
  )
  const naVaga = new Set(situacao.eleitos.map((i) => i.id))
  const naBeira = new Set(situacao.empatados.map((i) => i.id))
  const maior = Math.max(1, ...Object.values(parcial))

  const ultima = reveladas > 0 ? todasCedulas[reveladas - 1] : null
  const faltam = total - reveladas
  const acabou = faltam === 0

  function revelarMaisUma() {
    const proxima = todasCedulas[reveladas]
    if (!proxima) return
    const antes = posicaoNoPlacar(placar, proxima.indicacaoId)
    const depoisTotais = { ...parcial, [proxima.indicacaoId]: (parcial[proxima.indicacaoId] || 0) + 1 }
    const depois = posicaoNoPlacar(ordenarPlacar(prateleira, depoisTotais), proxima.indicacaoId)
    if (som) {
      if (depois < antes) somSubida()
      else somCedula()
    }
    setPiscando(proxima.indicacaoId)
    setReveladas((n) => Math.min(total, n + 1))
  }

  function proximaCedula() {
    if (rufando || acabou) return
    const ultimasCedulas = faltam <= CEDULAS_COM_TAMBORES
    if (!ultimasCedulas) {
      revelarMaisUma()
      return
    }
    const segundos = faltam === 1 ? TAMBORES_FINAL_SEGUNDOS : TAMBORES_SEGUNDOS
    setRufando(true)
    if (som) somTambores(segundos)
    temporizador.current = setTimeout(() => {
      setRufando(false)
      revelarMaisUma()
      botao.current?.focus()
    }, segundos * 1000)
  }

  function revelarTudo() {
    if (rufando) return
    if (!window.confirm('Revelar todas as cédulas de uma vez? O suspense vai embora.')) return
    setPiscando(null)
    setReveladas(total)
  }

  function alternarSom() {
    const novo = !som
    ligarSom(novo)
    setSom(novo)
  }

  // Espaço e seta para a direita também puxam a próxima cédula — para quem
  // apura com um teclado na mão enquanto projeta.
  useEffect(() => {
    function aoTecla(e) {
      if (e.key !== ' ' && e.key !== 'ArrowRight') return
      if (e.target instanceof HTMLInputElement) return
      e.preventDefault()
      if (acabou) aoConcluir()
      else proximaCedula()
    }
    document.addEventListener('keydown', aoTecla)
    return () => document.removeEventListener('keydown', aoTecla)
  })

  const votante = ultima ? membrosPorId[ultima.userId] : null
  const votado = ultima ? emDisputa.find((i) => i.id === ultima.indicacaoId) : null

  return (
    <Modal
      titulo={turno > 1 ? `Apuração — ${turno}º turno` : 'Apuração'}
      onFechar={onFechar}
      classe="modal-apuracao"
    >
      <div className="apuracao-cabecalho">
        <div className="apuracao-progresso" role="status">
          <strong>
            {reveladas} de {total}
          </strong>{' '}
          {total === 1 ? 'cédula' : 'cédulas'}
          {!acabou && (
            <span className="texto-tenue">
              {' '}
              · {faltam === 1 ? 'falta 1' : `faltam ${faltam}`}
            </span>
          )}
          <span className="apuracao-progresso-barra" aria-hidden="true">
            <span style={{ width: `${(reveladas / Math.max(1, total)) * 100}%` }} />
          </span>
        </div>
        <button
          type="button"
          className={`btn-icone apuracao-som${som ? '' : ' mudo'}`}
          onClick={alternarSom}
          aria-pressed={som}
          title={som ? 'Som ligado' : 'Som desligado'}
        >
          <IconeSino size={18} />
          <span>{som ? 'som' : 'mudo'}</span>
        </button>
      </div>

      <div className={`cedula${rufando ? ' cedula-rufando' : ''}`} key={rufando ? 'rufando' : reveladas}>
        {rufando ? (
          <div className="cedula-suspense">
            <span className="cedula-tambor" aria-hidden="true">
              🥁
            </span>
            <strong>{faltam === 1 ? 'A última cédula…' : 'Rufem os tambores…'}</strong>
          </div>
        ) : ultima ? (
          <>
            <Avatar membro={votante} />
            <div className="cedula-texto">
              <span className="cedula-quem">{votante?.nome || 'Alguém que já saiu do clube'}</span>
              <span className="texto-tenue">votou em</span>
              <strong className="cedula-livro">{votado?.titulo || 'um livro fora da disputa'}</strong>
            </div>
            <CapaPequena indicacao={votado} />
          </>
        ) : (
          <div className="cedula-suspense">
            <IconeUrna size={30} />
            <strong>A urna está lacrada.</strong>
            <span className="texto-tenue">
              {total === 1 ? 'Uma cédula' : `${total} cédulas`} lá dentro.{' '}
              {vagas === 1 ? 'Um livro será eleito.' : `${vagas} livros serão eleitos.`}
            </span>
          </div>
        )}
      </div>

      <div className="apuracao-comandos">
        {acabou ? (
          <button ref={botao} className="btn" onClick={aoConcluir} autoFocus>
            <IconeCoroa size={18} />
            Ver o resultado
          </button>
        ) : (
          <button ref={botao} className="btn" onClick={proximaCedula} disabled={rufando} autoFocus>
            <IconeUrna size={18} />
            {rufando ? '…' : reveladas === 0 ? 'Tirar a primeira cédula' : 'Próxima cédula'}
          </button>
        )}
        {!acabou && (
          <button type="button" className="btn-texto" onClick={revelarTudo} disabled={rufando}>
            Revelar tudo de uma vez
          </button>
        )}
      </div>

      <ol
        className="apuracao-placar"
        style={{ height: placar.length * ALTURA_LINHA }}
        aria-label="Contagem parcial"
      >
        {placar.map((i, posicao) => {
          const n = parcial[i.id] || 0
          const classes = ['apuracao-linha']
          if (n > 0 && naVaga.has(i.id)) classes.push('na-vaga')
          if (naBeira.has(i.id) && n > 0) classes.push('na-beira')
          if (piscando === i.id) classes.push('recebeu-voto')
          return (
            <li
              key={i.id}
              className={classes.join(' ')}
              style={{ transform: `translateY(${posicao * ALTURA_LINHA}px)` }}
            >
              <span className="apuracao-posicao">{posicao + 1}</span>
              <CapaPequena indicacao={i} />
              <span className="apuracao-dados">
                <strong className="apuracao-titulo apuracao-titulo-curto">{i.titulo}</strong>
                <span className="apuracao-barra" role="img" aria-label={`${n} votos`}>
                  <span style={{ width: `${(n / maior) * 100}%` }} />
                </span>
              </span>
              <span className="apuracao-votos" key={n}>
                <span className={n > 0 ? 'apuracao-numero pulsa' : 'apuracao-numero'}>{n}</span>
                <small>{n === 1 ? 'voto' : 'votos'}</small>
              </span>
            </li>
          )
        })}
      </ol>
      <p className="texto-tenue apuracao-legenda">
        {vagas === 1 ? 'A linha dourada é a vaga.' : `As linhas douradas são as ${vagas} vagas.`}{' '}
        Quem indicou cada livro aparece no fim.
      </p>
    </Modal>
  )
}

// ---------- O resultado: pódio, ou a decisão de um empate ----------

function ResultadoDaUrna({
  eleicao,
  turno,
  resultado,
  eleitosAntes,
  membrosPorId,
  escolhaManual,
  setEscolhaManual,
  novoPrazo,
  setNovoPrazo,
  ocupado,
  erro,
  onFechar,
  aoCoroar,
  aoNovoTurno,
}) {
  const { ordenados, totais, votantes, maior, eleitos, empatados, restantes, completa } = resultado
  const semVotos = votantes === 0
  // Os eleitos, na ordem da fila: primeiro os de turnos anteriores, depois os
  // deste. Dois eleitos com os mesmos votos entram em ordem alfabética — mas
  // quem apura pode inverter, porque a ordem decide qual é o próximo livro.
  const [ordemPodio, setOrdemPodio] = useState(() => [...eleitosAntes, ...eleitos].map((i) => i.id))
  const podio = ordemPodio
    .map((id) => [...eleitosAntes, ...eleitos].find((i) => i.id === id))
    .filter(Boolean)
  function inverterNoPodio(k) {
    setOrdemPodio((atual) => {
      const nova = [...atual]
      ;[nova[k], nova[k + 1]] = [nova[k + 1], nova[k]]
      return nova
    })
  }
  // Sem nenhum voto não há empate nem eleito: a escolha manual vale para
  // qualquer um dos livros em disputa, até preencher as vagas.
  const candidatosManuais = semVotos ? ordenados : empatados
  const vagasManuais = restantes
  const manuais = escolhaManual
    .map((id) => candidatosManuais.find((i) => i.id === id))
    .filter(Boolean)
  const [celebrando, setCelebrando] = useState(completa && podio.length > 0)

  useEffect(() => {
    if (completa && podio.length) somFanfarra()
    // só na entrada do pódio
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function alternarManual(id) {
    setEscolhaManual((atual) => {
      if (atual.includes(id)) return atual.filter((x) => x !== id)
      if (vagasManuais === 1) return [id]
      if (atual.length >= vagasManuais) return atual
      return [...atual, id]
    })
  }

  // Votos de um livro eleito num turno anterior, para o pódio não ficar sem
  // número.
  function votosDe(indicacao) {
    if (indicacao.id in totais) return totais[indicacao.id]
    const registro = (eleicao.apuracoes || []).find((a) => (a.eleitos || []).includes(indicacao.id))
    return registro?.totais?.[indicacao.id] ?? null
  }

  return (
    <Modal
      titulo={turno > 1 ? `Resultado — ${turno}º turno` : 'Resultado'}
      onFechar={onFechar}
      classe="modal-apuracao"
    >
      {celebrando && <Confete />}

      {completa && podio.length > 0 ? (
        <>
          <p className="texto-suave" style={{ marginTop: 0 }}>
            {votantes} {votantes === 1 ? 'pessoa votou' : 'pessoas votaram'}.{' '}
            {podio.length === 1 ? 'O eleito' : 'Os eleitos'}, e quem indicou cada um:
          </p>
          <ol className="podio">
            {podio.map((i, k) => {
              const n = votosDe(i)
              const seguinte = podio[k + 1]
              const empatadoComSeguinte =
                !!seguinte && n != null && votosDe(seguinte) === n && !eleitosAntes.includes(i)
              return (
                <li key={i.id} className={`podio-lugar podio-${k + 1}`}>
                  <span className="podio-ordinal">
                    <IconeCoroa size={k === 0 ? 22 : 16} /> {ordinal(k + 1)}
                  </span>
                  <CapaGrande indicacao={i} />
                  <strong className="podio-titulo">{i.titulo}</strong>
                  {i.autor && <span className="autor">{i.autor}</span>}
                  <span className="apuracao-quem">
                    indicado por {membrosPorId[i.userId]?.nome || 'alguém que já saiu do clube'}
                  </span>
                  {n != null && (
                    <span className="podio-votos">
                      {n} {n === 1 ? 'voto' : 'votos'}
                    </span>
                  )}
                  <span className="podio-papel">{papelNaFila(k)}</span>
                  {empatadoComSeguinte && (
                    <button type="button" className="btn-texto podio-trocar" onClick={() => inverterNoPodio(k)}>
                      Empate com o {ordinal(k + 2)}: trocar a ordem da fila
                    </button>
                  )}
                </li>
              )
            })}
          </ol>

          {erro && <div className="erro">{erro}</div>}

          <button
            className="btn"
            onClick={() => aoCoroar(podio)}
            disabled={!!ocupado}
            style={{ width: '100%', marginTop: '0.9rem' }}
          >
            <IconeCoroa size={18} />
            {ocupado === 'coroar'
              ? 'Encerrando…'
              : podio.length === 1
                ? `Confirmar: ${podio[0].titulo} é o próximo livro`
                : `Confirmar: ${podio.length} livros entram na fila`}
          </button>
          <p className="texto-tenue centro" style={{ margin: '0.6rem 0 0' }}>
            Ninguém é tirado do que está lendo. Quem já terminou começa o 1º da fila.
          </p>
        </>
      ) : (
        <>
          {podio.length > 0 && (
            <div className="aviso aviso-bom">
              {podio.length === 1 ? 'Já eleito' : 'Já eleitos'}: <strong>{listarTitulos(podio)}</strong>.
            </div>
          )}
          {semVotos ? (
            <p className="texto-suave" style={{ marginTop: 0 }}>
              Ninguém votou neste turno ainda.
            </p>
          ) : (
            <div className="aviso aviso-bom">
              <strong>Empate</strong> entre {listarTitulos(empatados)}, com {maior === 0 ? 'nenhum' : maior}{' '}
              {maior === 1 ? 'voto' : 'votos'} cada,{' '}
              {restantes === 1 ? 'pela vaga que falta' : `pelas ${restantes} vagas que faltam`}. Decida
              como desempatar:
            </div>
          )}

          {!semVotos && (
            <div className="apuracao-opcao">
              <h4>
                <IconeUrna size={18} /> Novo turno só entre os empatados
              </h4>
              <p className="texto-suave">
                O {turno + 1}º turno abre para o clube inteiro, com{' '}
                {votosPorPessoa(turno + 1, restantes)}{' '}
                {votosPorPessoa(turno + 1, restantes) === 1 ? 'voto' : 'votos'} por pessoa, só entre
                esses livros. As indicações ficam fechadas.
              </p>
              <div className="campo">
                <label htmlFor="novo-prazo">Votação até (opcional)</label>
                <input
                  id="novo-prazo"
                  type="date"
                  value={novoPrazo}
                  onChange={(e) => setNovoPrazo(e.target.value)}
                />
              </div>
              <button className="btn" onClick={aoNovoTurno} disabled={!!ocupado}>
                {ocupado === 'turno' ? 'Abrindo…' : `Abrir o ${turno + 1}º turno`}
              </button>
            </div>
          )}

          <div className="apuracao-opcao">
            <h4>
              <IconeCoroa size={18} />{' '}
              {semVotos ? 'Escolher mesmo assim' : 'Desempatar agora'}
            </h4>
            <p className="texto-suave">
              {semVotos
                ? `Se o clube já decidiu na conversa, escolha ${vagasManuais === 1 ? 'o livro' : `os ${vagasManuais} livros`} aqui e encerre a eleição.`
                : `Cara ou coroa, conversa, voto de minerva — o clube decide ali e você registra ${vagasManuais === 1 ? 'o livro' : `os ${vagasManuais} livros, na ordem em que entram na fila`}:`}
            </p>
            <div className="apuracao-escolha" role="group" aria-label="Livros escolhidos">
              {candidatosManuais.map((i) => {
                const marcado = escolhaManual.includes(i.id)
                const posicao = marcado ? podio.length + escolhaManual.indexOf(i.id) + 1 : null
                return (
                  <label key={i.id} className={`campo-caixa${marcado ? ' marcada' : ''}`}>
                    <input
                      type={vagasManuais === 1 ? 'radio' : 'checkbox'}
                      name="desempate"
                      value={i.id}
                      checked={marcado}
                      onChange={() => alternarManual(i.id)}
                    />
                    <span>
                      {i.titulo}
                      {posicao != null && vagasManuais > 1 && (
                        <em className="texto-tenue"> · {ordinal(posicao)} da fila</em>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
            {erro && <div className="erro">{erro}</div>}
            <button
              className="btn btn-fantasma"
              onClick={() => {
                setCelebrando(true)
                aoCoroar([...podio, ...manuais])
              }}
              disabled={manuais.length !== vagasManuais || !!ocupado}
            >
              {ocupado === 'coroar'
                ? 'Encerrando…'
                : manuais.length !== vagasManuais
                  ? `Escolha ${vagasManuais === 1 ? '1 livro' : `${vagasManuais} livros`}`
                  : podio.length + manuais.length === 1
                    ? 'Encerrar com este livro'
                    : 'Encerrar com estes livros'}
            </button>
          </div>
        </>
      )}

      <details className="apuracao-completa">
        <summary>Contagem completa</summary>
        <ol className="apuracao-lista">
          {ordenados.map((i) => {
            const n = totais[i.id] || 0
            const eleito = podio.some((p) => p.id === i.id)
            return (
              <li key={i.id} className={`apuracao-item${eleito ? ' apuracao-vencedor' : ''}`}>
                <CapaPequena indicacao={i} />
                <div className="apuracao-dados">
                  <strong className="apuracao-titulo">
                    {eleito && <IconeCoroa size={16} />} {i.titulo}
                  </strong>
                  <span className="apuracao-quem">
                    indicado por {membrosPorId[i.userId]?.nome || 'alguém que já saiu do clube'}
                  </span>
                  <div className="apuracao-barra" role="img" aria-label={`${n} votos`}>
                    <span style={{ width: `${maior ? (n / maior) * 100 : 0}%` }} />
                  </div>
                </div>
                <span className="apuracao-votos">
                  {n}
                  <small>{n === 1 ? 'voto' : 'votos'}</small>
                </span>
              </li>
            )
          })}
        </ol>
      </details>
    </Modal>
  )
}

// ---------- Peças ----------

function Avatar({ membro }) {
  const cor = membro ? corDoMembro(membro) : 'var(--dourado)'
  return membro?.avatarUrl ? (
    <img className="cedula-avatar" src={membro.avatarUrl} alt="" style={{ borderColor: cor }} />
  ) : (
    <span className="cedula-avatar cedula-inicial" style={{ borderColor: cor }}>
      {membro ? inicial(membro.nome) : '?'}
    </span>
  )
}

function CapaPequena({ indicacao }) {
  return indicacao?.capaUrl ? (
    <img className="capinha" src={indicacao.capaUrl} alt="" />
  ) : (
    <div className="capinha capinha-vazia">
      <IconeLivro size={16} />
    </div>
  )
}

function CapaGrande({ indicacao }) {
  return indicacao?.capaUrl ? (
    <img className="podio-capa" src={indicacao.capaUrl} alt={`Capa de ${indicacao.titulo}`} />
  ) : (
    <div className="podio-capa capa-sem-imagem">
      <IconeLivro size={34} />
    </div>
  )
}

function papelNaFila(k) {
  if (k === 0) return 'o próximo livro do clube'
  if (k === 1) return 'o seguinte, logo atrás na fila'
  return 'depois dele na fila'
}

// Do mais votado ao menos; entre iguais, a ordem da prateleira — para as
// linhas não trocarem de lugar sem motivo.
function ordenarPlacar(prateleira, totais) {
  return [...prateleira].sort((a, b) => (totais[b.id] || 0) - (totais[a.id] || 0))
}

function posicaoNoPlacar(placar, id) {
  return placar.findIndex((i) => i.id === id)
}

// Remonta, a partir do registro gravado, o mesmo objeto que `apurar` devolve —
// para a tela de decisão ser uma só. As vagas são as que sobraram para este
// turno (as já preenchidas estão em `eleitos` da eleição).
function reconstruir(registro, eleicao, indicacoes) {
  const emDisputa = indicacoesEmDisputa(eleicao, indicacoes)
  return classificar({
    emDisputa,
    totais: registro.totais || {},
    votantes: registro.votantes || 0,
    vagas: vagasRestantes(eleicao),
  })
}
