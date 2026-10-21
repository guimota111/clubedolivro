import { useMemo, useState } from 'react'
import Modal from './Modal'
import {
  registrarApuracao,
  abrirNovoTurno,
  encerrarEleicaoComVencedor,
} from '../lib/db'
import { anunciar } from '../lib/push'
import { textoNovoTurno, textoResultado } from '../lib/atividades'
import { conferirSenhaDaUrna } from '../lib/urna'
import { podeEntrarJunto } from '../lib/series'
import {
  apurar,
  indicacoesEmDisputa,
  listarTitulos,
  votosPorPessoa,
} from '../lib/eleicao'
import { CampoSenha } from './SenhaUrnaModal'
import { IconeCadeado, IconeCoroa, IconeLivro, IconeUrna } from './Icones'

// A urna se abre aqui. Primeiro a senha; depois a contagem, que até este
// momento ninguém viu — nem quem está apurando. Com um vencedor claro, ele vira
// o livro do clube na hora. Com empate no topo, quem apura escolhe: um novo
// turno só entre os empatados, ou o desempate decidido ali na conversa.
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

  const [senha, setSenha] = useState('')
  const [passo, setPasso] = useState('senha')
  const [resultado, setResultado] = useState(null)
  const [escolhaManual, setEscolhaManual] = useState('')
  const [novoPrazo, setNovoPrazo] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')

  async function abrirUrna(e) {
    e.preventDefault()
    setOcupado('senha')
    setErro('')
    if (!(await conferirSenhaDaUrna(senha))) {
      setErro('Senha incorreta. A senha da urna fica com quem administra o clube.')
      setOcupado('')
      return
    }
    setResultado(registrada ? reconstruir(registrada, eleicao, indicacoes) : apurar(votos, eleicao, indicacoes))
    setPasso('resultado')
    setOcupado('')
  }

  // Grava a contagem na eleição, se ainda não foi gravada.
  async function garantirRegistro() {
    if (registrada) return
    await registrarApuracao(eleicao.id, turno, resultado)
  }

  async function coroar(indicacao) {
    const ok = window.confirm(
      `Encerrar a eleição com “${indicacao.titulo}”?\n\n` +
        'Ele vira o livro do clube agora mesmo' +
        (livrosAtuais.length
          ? podeEntrarJunto(livrosAtuais, indicacao.serie)
            ? ', ao lado dos livros da série em leitura.'
            : `; o que está em leitura é encerrado e vai para o histórico com o vencedor da rodada.`
          : '.')
    )
    if (!ok) return
    setOcupado('coroar')
    setErro('')
    try {
      await garantirRegistro()
      const livroId = await encerrarEleicaoComVencedor(eleicao.id, indicacao, {
        juntarASerie: podeEntrarJunto(livrosAtuais, indicacao.serie),
      })
      anunciar(
        `resultado-${eleicao.id}`,
        textoResultado(indicacao.titulo, membrosPorId[indicacao.userId]?.nome)
      )
      aoEncerrar?.(livroId)
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível encerrar a eleição. Tente novamente.')
      setOcupado('')
    }
  }

  async function novoTurno() {
    const finalistas = resultado.empatados
    const ok = window.confirm(
      `Abrir o ${turno + 1}º turno entre ${listarTitulos(finalistas)}?\n\n` +
        `Cada membro terá ${votosPorPessoa(turno + 1)} voto. Quem indicou continua sem poder votar no próprio livro.`
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
        { prazoVotacao: novoPrazo || null }
      )
      anunciar(
        `apuracao-${eleicao.id}-${turno}`,
        textoNovoTurno(turno + 1, listarTitulos(finalistas))
      )
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível abrir o novo turno. Tente novamente.')
      setOcupado('')
    }
  }

  if (passo === 'senha') {
    return (
      <Modal titulo="Abrir a urna" onFechar={onFechar}>
        <p className="texto-suave" style={{ marginTop: 0 }}>
          {registrada
            ? 'A apuração deste turno deu empate e está à espera de uma decisão. Com a senha, escolha entre um novo turno e o desempate manual.'
            : 'A contagem aparece só depois da senha — ninguém a viu até agora, nem você. Com um vencedor, a eleição termina e ele vira o livro do clube na hora.'}
        </p>
        <form onSubmit={abrirUrna}>
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

  const { ordenados, totais, votantes, maior, empatados, vencedor } = resultado
  const semVotos = votantes === 0
  // Sem nenhum voto não há empate nem vencedor: a escolha manual vale para
  // qualquer um dos livros em disputa.
  const candidatosManuais = semVotos ? ordenados : empatados
  const manual = candidatosManuais.find((i) => i.id === escolhaManual) || null

  return (
    <Modal titulo={turno > 1 ? `Apuração — ${turno}º turno` : 'Apuração'} onFechar={onFechar}>
      <p className="texto-suave" style={{ marginTop: 0 }}>
        {semVotos
          ? 'Ninguém votou neste turno ainda.'
          : `${votantes} ${votantes === 1 ? 'pessoa votou' : 'pessoas votaram'}. Quem indicou cada livro aparece agora.`}
      </p>

      <ol className="apuracao-lista">
        {ordenados.map((i) => {
          const n = totais[i.id] || 0
          const noTopo = !semVotos && n === maior
          return (
            <li
              key={i.id}
              className={`apuracao-item${noTopo ? ' apuracao-topo' : ''}${vencedor?.id === i.id ? ' apuracao-vencedor' : ''}`}
            >
              {i.capaUrl ? (
                <img className="capinha" src={i.capaUrl} alt="" />
              ) : (
                <div className="capinha capinha-vazia">
                  <IconeLivro size={16} />
                </div>
              )}
              <div className="apuracao-dados">
                <strong className="apuracao-titulo">
                  {vencedor?.id === i.id && <IconeCoroa size={16} />} {i.titulo}
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

      {erro && <div className="erro">{erro}</div>}

      {vencedor ? (
        <>
          <div className="aviso aviso-bom">
            <strong>{vencedor.titulo}</strong> venceu com {maior}{' '}
            {maior === 1 ? 'voto' : 'votos'}. Ao confirmar, ele vira o livro do
            clube agora mesmo.
          </div>
          <button
            className="btn"
            onClick={() => coroar(vencedor)}
            disabled={!!ocupado}
            style={{ width: '100%', marginTop: '0.9rem' }}
          >
            <IconeCoroa size={18} />
            {ocupado === 'coroar' ? 'Encerrando…' : `Confirmar: ${vencedor.titulo} é o próximo livro`}
          </button>
        </>
      ) : (
        <>
          {!semVotos && (
            <div className="aviso aviso-bom">
              <strong>Empate</strong> entre {listarTitulos(empatados)}, com {maior}{' '}
              {maior === 1 ? 'voto' : 'votos'} cada. Decida como desempatar:
            </div>
          )}

          {!semVotos && (
            <div className="apuracao-opcao">
              <h4>
                <IconeUrna size={18} /> Novo turno só entre os empatados
              </h4>
              <p className="texto-suave">
                O {turno + 1}º turno abre para o clube inteiro, com{' '}
                {votosPorPessoa(turno + 1)} voto por pessoa. As indicações ficam
                fechadas.
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
              <button className="btn" onClick={novoTurno} disabled={!!ocupado}>
                {ocupado === 'turno' ? 'Abrindo…' : `Abrir o ${turno + 1}º turno`}
              </button>
            </div>
          )}

          <div className="apuracao-opcao">
            <h4>
              <IconeCoroa size={18} />{' '}
              {semVotos ? 'Escolher o livro mesmo assim' : 'Desempatar agora'}
            </h4>
            <p className="texto-suave">
              {semVotos
                ? 'Se o clube já decidiu na conversa, escolha o livro aqui e encerre a eleição.'
                : 'Cara ou coroa, conversa, voto de minerva — o clube decide ali e você registra:'}
            </p>
            <div className="apuracao-escolha" role="radiogroup" aria-label="Livro vencedor">
              {candidatosManuais.map((i) => (
                <label key={i.id} className="campo-caixa">
                  <input
                    type="radio"
                    name="desempate"
                    value={i.id}
                    checked={escolhaManual === i.id}
                    onChange={() => setEscolhaManual(i.id)}
                  />
                  <span>{i.titulo}</span>
                </label>
              ))}
            </div>
            <button
              className="btn btn-fantasma"
              onClick={() => manual && coroar(manual)}
              disabled={!manual || !!ocupado}
            >
              {ocupado === 'coroar' ? 'Encerrando…' : 'Encerrar com este livro'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

// Remonta, a partir do registro gravado, o mesmo objeto que `apurar` devolve —
// para a tela de decisão ser uma só.
function reconstruir(registro, eleicao, indicacoes) {
  const emDisputa = indicacoesEmDisputa(eleicao, indicacoes)
  const totais = registro.totais || {}
  const ordenados = [...emDisputa].sort(
    (a, b) => (totais[b.id] || 0) - (totais[a.id] || 0) || a.titulo.localeCompare(b.titulo, 'pt-BR')
  )
  const maior = ordenados.length ? totais[ordenados[0].id] || 0 : 0
  const ids = new Set(registro.empatados || [])
  const empatados = emDisputa.filter((i) => ids.has(i.id))
  return {
    totais,
    ordenados,
    votantes: registro.votantes || 0,
    maior,
    empatados,
    vencedor: empatados.length === 1 ? empatados[0] : null,
  }
}
