import { useMemo, useState } from 'react'
import { promoverProximoLivro, tirarProximoLivroDaFila } from '../lib/db'
import { pctDoProgresso, inicial } from '../lib/formato'
import { corDoMembro } from '../lib/cores'
import { faixasDeProgresso } from '../lib/progresso24h'
import { useVerFoto } from './FotoContext'
import {
  IconeLivro,
  IconeCadeado,
  IconeMarcador,
  IconePena,
  IconeCoroa,
} from './Icones'

// A área do próximo livro do clube.
//
// O clube lê um livro por vez, mas quem termina antes não fica parado: ao
// cruzar os 100% do livro atual, o leitor destrava esta área e pode escolher —
// junto com os outros que terminaram — qual será o próximo, começando a ler e
// a marcar progresso desde já. Quando o ciclo virar, esse livro assume o posto
// sem que ninguém perca o que já andou.
export default function ProximoLivro({
  userId,
  membros,
  livroAtual,
  proximo,
  porUsuario,
  minhaPct,
  quantosTerminaram,
  aoEscolher,
  aoEditar,
  aoAtualizarProgresso,
}) {
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')

  // Sem livro em leitura não existe "próximo": é só cadastrar o do clube.
  if (!livroAtual) return null

  const destravado = minhaPct >= 100

  if (!destravado) {
    return (
      <section className="painel proximo-livro proximo-trancado">
        <h2 className="secao-titulo">
          <IconeCadeado size={22} /> O próximo livro
        </h2>
        <div className="resenha-trancada">
          <span>
            Esta área libera quando você terminar <strong>{livroAtual.titulo}</strong>{' '}
            (100%). Você está em {minhaPct}%.
          </span>
        </div>
        <p className="texto-tenue" style={{ margin: 0 }}>
          {proximo ? (
            <>
              Quem já chegou ao fim escolheu <strong>{proximo.titulo}</strong> para
              a próxima rodada e começou a leitura. Corre que dá tempo.
            </>
          ) : (
            <>
              Quem chega ao fim escolhe aqui o livro da próxima rodada e já pode
              começar a ler, sem esperar o clube virar a página.
            </>
          )}
        </p>
      </section>
    )
  }

  async function promover() {
    const ok = window.confirm(
      `Tornar “${proximo.titulo}” o livro do clube?\n\n` +
        `“${livroAtual.titulo}” será encerrado e arquivado no histórico com o ` +
        `vencedor da rodada. Quem já começou o novo mantém o progresso; quem ` +
        `ainda não começou entra em 0%.`
    )
    if (!ok) return
    setErro('')
    setOcupado('promover')
    try {
      await promoverProximoLivro(proximo.id)
    } catch (err) {
      console.error(err)
      setErro('Não foi possível trocar o livro do clube. Tente novamente.')
    } finally {
      setOcupado('')
    }
  }

  async function tirarDaFila() {
    const ok = window.confirm(
      `Tirar “${proximo.titulo}” da fila?\n\n` +
        `O clube continua em “${livroAtual.titulo}”. Nada é apagado: o progresso ` +
        `e as notas de quem já começou ficam guardados, só saem da tela.`
    )
    if (!ok) return
    setErro('')
    setOcupado('tirar')
    try {
      await tirarProximoLivroDaFila(proximo.id)
    } catch (err) {
      console.error(err)
      setErro('Não foi possível tirar o livro da fila. Tente novamente.')
    } finally {
      setOcupado('')
    }
  }

  return (
    <section className="painel proximo-livro">
      <h2 className="secao-titulo">
        <IconeLivro size={22} /> O próximo livro
      </h2>

      <p className="texto-suave proximo-intro">
        Você terminou <strong>{livroAtual.titulo}</strong> — esta área é sua. O
        clube ainda está no livro de agora
        {quantosTerminaram > 0 && (
          <>
            {' '}
            ({quantosTerminaram} de {membros.length}{' '}
            {quantosTerminaram === 1 ? 'já terminou' : 'já terminaram'})
          </>
        )}
        , mas quem chegou ao fim pode emendar no próximo desde já.
      </p>

      {!proximo ? (
        <div className="centro proximo-vazio">
          <p className="texto-suave">
            Ninguém escolheu o próximo livro ainda. Combine com quem também
            terminou e coloque um na fila.
          </p>
          <button className="btn" onClick={aoEscolher}>
            <IconeLivro size={18} />
            Escolher o próximo livro
          </button>
        </div>
      ) : (
        <>
          <div className="proximo-cabecalho">
            {proximo.capaUrl ? (
              <img
                className="capinha capinha-proximo"
                src={proximo.capaUrl}
                alt={`Capa de ${proximo.titulo}`}
              />
            ) : (
              <div className="capinha capinha-proximo capinha-vazia">
                <IconeLivro size={20} />
              </div>
            )}
            <div>
              <h3 style={{ margin: 0 }}>{proximo.titulo}</h3>
              {proximo.autor && <div className="autor">{proximo.autor}</div>}
              <span className="resenha-selo selo-fila">Na fila</span>
            </div>
          </div>

          <LeitoresDoProximo
            membros={membros}
            porUsuario={porUsuario}
            meuUserId={userId}
          />

          {erro && <div className="erro">{erro}</div>}

          <div className="proximo-acoes">
            <button className="btn" onClick={aoAtualizarProgresso}>
              <IconeMarcador size={18} />
              Meu progresso neste livro
            </button>
            <button
              className="btn btn-fantasma"
              onClick={promover}
              disabled={!!ocupado}
            >
              <IconeCoroa size={18} />
              {ocupado === 'promover' ? 'Trocando…' : 'Tornar o livro do clube'}
            </button>
          </div>
          <div className="proximo-acoes-secundarias">
            <button className="btn-texto" onClick={aoEditar}>
              <IconePena size={14} /> Corrigir dados do livro
            </button>
            <span className="texto-tenue" aria-hidden="true">
              ·
            </span>
            <button className="btn-texto" onClick={tirarDaFila} disabled={!!ocupado}>
              {ocupado === 'tirar' ? 'Tirando…' : 'Tirar da fila'}
            </button>
          </div>

          <p className="texto-tenue proximo-rodape">
            Enquanto ele estiver na fila, o clube continua em{' '}
            <strong>{livroAtual.titulo}</strong> — a corrida lá em cima não muda.
            Ao tornar este o livro do clube, o atual é arquivado no histórico e
            todo mundo passa a correr por aqui.
          </p>
        </>
      )}
    </section>
  )
}

// Quem já começou o livro da fila, do mais adiantado ao menos. Só aparece
// quem marcou algum progresso: uma lista com o clube inteiro em 0% não conta
// nada e ainda faz o painel parecer vazio.
function LeitoresDoProximo({ membros, porUsuario, meuUserId }) {
  const verFoto = useVerFoto()

  const lendo = useMemo(() => {
    const agora = Date.now()
    return membros
      .map((membro) => {
        const prog = porUsuario[membro.id]
        const pct = pctDoProgresso(prog, 0)
        return {
          membro,
          pct,
          faixas: faixasDeProgresso(prog, pct, agora),
          cor: corDoMembro(membro),
        }
      })
      .filter((item) => item.pct > 0)
      .sort((a, b) => {
        if (b.pct !== a.pct) return b.pct - a.pct
        return (a.membro.nome || '').localeCompare(b.membro.nome || '')
      })
  }, [membros, porUsuario])

  if (!lendo.length) {
    return (
      <p className="texto-tenue proximo-sem-leitores">
        Ninguém marcou progresso neste livro ainda. Comece a contagem.
      </p>
    )
  }

  return (
    <ul className="fila-leitores">
      {lendo.map(({ membro, pct, faixas, cor }) => (
        <li
          className={`fila-leitor${membro.id === meuUserId ? ' eu' : ''}`}
          key={membro.id}
        >
          {membro.avatarUrl ? (
            <img
              className="fila-avatar avatar-clicavel"
              src={membro.avatarUrl}
              alt={membro.nome || ''}
              style={{ borderColor: cor }}
              onClick={() => verFoto(membro.avatarUrl, membro.nome)}
            />
          ) : (
            <span className="fila-avatar fila-inicial" style={{ borderColor: cor }}>
              {inicial(membro.nome)}
            </span>
          )}
          <div className="fila-dados">
            <span className="fila-nome">
              {membro.nome}
              {membro.id === meuUserId && <em className="fila-eu"> (você)</em>}
            </span>
            <div
              className="fila-barra"
              role="img"
              aria-label={`${membro.nome}: ${pct}%`}
            >
              <span
                className="fila-barra-base"
                style={{ width: `${faixas.base}%`, background: cor }}
              />
              <span
                className="fila-barra-recente"
                style={{ width: `${faixas.recente}%` }}
              />
            </div>
          </div>
          <span className="fila-pct">{pct}%</span>
        </li>
      ))}
    </ul>
  )
}
