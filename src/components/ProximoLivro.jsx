import { useMemo, useState } from 'react'
import {
  promoverProximoLivro,
  tirarProximoLivroDaFila,
  devolverParaFila,
  reordenarFila,
} from '../lib/db'
import { anunciar } from '../lib/push'
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
  IconeSeta,
} from './Icones'

// A página do próximo livro do clube: a fila, por ordem.
//
// A fila é de todo mundo: qualquer membro vê o que vem a seguir, corrige os
// dados e, quando o clube decidir, vira a página com "Tornar o livro do
// clube". O que exige ter terminado o livro de agora é só ADIANTAR a leitura
// do próximo (marcar progresso nele) — quem ainda está no atual não precisa
// de outra corrida, e a área de progresso fica trancada com quanto falta.
//
// Um livro que saiu da fila sem ter sido encerrado não some: fica numa lista
// à parte, com um botão para voltar — ele continua sendo um candidato a
// próximo livro, e não um livro anterior.
export default function ProximoLivro({
  userId,
  membros,
  livroAtual,
  proximo,
  fila = [],
  foraDaFila = [],
  entraNaSerie = false,
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

  const terminei = minhaPct >= 100

  async function promover() {
    // Sendo outro volume da mesma série, ele ENTRA AO LADO do que já está em
    // leitura: ninguém é obrigado a largar o livro em que está para o clube
    // avançar.
    const ok = window.confirm(
      entraNaSerie
        ? `Abrir “${proximo.titulo}” para o clube?\n\n` +
            `Ele é da mesma série, então entra ao lado de “${livroAtual.titulo}” — ` +
            `nada é encerrado e quem ainda está no livro de agora continua nele.`
        : `Tornar “${proximo.titulo}” o livro do clube?\n\n` +
            `“${livroAtual.titulo}” será encerrado e arquivado no histórico com o ` +
            `vencedor da rodada. Quem já começou o novo mantém o progresso; quem ` +
            `ainda não começou entra em 0%.`
    )
    if (!ok) return
    setErro('')
    setOcupado('promover')
    try {
      await promoverProximoLivro(proximo.id, { juntarASerie: entraNaSerie })
      anunciar(`livro-${proximo.id}`, `A Patoteca começou a ler ${proximo.titulo}.`)
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
        `e as notas de quem já começou ficam guardados, e dá para devolvê-lo à fila depois.`
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

  // Troca o livro na posição `k` com o vizinho (`delta` = -1 sobe, +1 desce)
  // e grava a ordem inteira: a fila passa a ser a que está na tela.
  async function mover(k, delta) {
    const alvo = k + delta
    if (alvo < 0 || alvo >= fila.length) return
    const ids = fila.map((l) => l.id)
    ;[ids[k], ids[alvo]] = [ids[alvo], ids[k]]
    setErro('')
    setOcupado('reordenar')
    try {
      await reordenarFila(ids)
    } catch (err) {
      console.error(err)
      setErro('Não foi possível reordenar a fila. Tente novamente.')
    } finally {
      setOcupado('')
    }
  }

  async function devolver(livro) {
    setErro('')
    setOcupado(`devolver-${livro.id}`)
    try {
      await devolverParaFila(livro.id)
    } catch (err) {
      console.error(err)
      setErro('Não foi possível devolver o livro à fila. Tente novamente.')
    } finally {
      setOcupado('')
    }
  }

  return (
    <>
      <section className="painel proximo-livro">
        <h2 className="secao-titulo">
          <IconeLivro size={22} /> O próximo livro
        </h2>

        <p className="texto-suave proximo-intro">
          O clube ainda está em <strong>{livroAtual.titulo}</strong>
          {quantosTerminaram > 0 && (
            <>
              {' '}
              ({quantosTerminaram} de {membros.length}{' '}
              {quantosTerminaram === 1 ? 'já terminou' : 'já terminaram'})
            </>
          )}
          . Aqui fica o que vem depois — e quem já chegou ao fim pode emendar no
          próximo desde já.
        </p>

        {!proximo ? (
          <div className="centro proximo-vazio">
            <p className="texto-suave">
              Ninguém escolheu o próximo livro ainda. Elejam um na página da
              Eleição, ou coloque um na fila por aqui.
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
                <span className="resenha-selo selo-fila">
                  {fila.length > 1 ? '1º da fila' : 'Na fila'}
                </span>
              </div>
            </div>

            {fila.length > 1 && (
              <div className="fila-ordem">
                <p className="texto-tenue proximo-depois">
                  A fila, na ordem. As setas trocam a posição; quando o 1º virar o
                  livro do clube, o seguinte assume a fila sozinho.
                </p>
                <ol className="fila-lista">
                  {fila.map((l, k) => (
                    <li className={`fila-item${k === 0 ? ' primeiro' : ''}`} key={l.id}>
                      <span className="fila-posicao">{k + 1}º</span>
                      {l.capaUrl ? (
                        <img className="fila-capa" src={l.capaUrl} alt="" aria-hidden="true" />
                      ) : (
                        <span className="fila-capa fila-capa-vazia">
                          <IconeLivro size={14} />
                        </span>
                      )}
                      <span className="fila-titulo">
                        {l.titulo}
                        {l.autor && <em className="fila-autor"> · {l.autor}</em>}
                      </span>
                      <span className="fila-setas">
                        <button
                          type="button"
                          className="fila-seta"
                          aria-label={`Subir ${l.titulo} na fila`}
                          disabled={!!ocupado || k === 0}
                          onClick={() => mover(k, -1)}
                        >
                          <IconeSeta size={16} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <button
                          type="button"
                          className="fila-seta"
                          aria-label={`Descer ${l.titulo} na fila`}
                          disabled={!!ocupado || k === fila.length - 1}
                          onClick={() => mover(k, 1)}
                        >
                          <IconeSeta size={16} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <LeitoresDoProximo membros={membros} porUsuario={porUsuario} meuUserId={userId} />

            {erro && <div className="erro">{erro}</div>}

            <div className="proximo-acoes">
              {terminei ? (
                <button className="btn" onClick={aoAtualizarProgresso}>
                  <IconeMarcador size={18} />
                  Meu progresso neste livro
                </button>
              ) : (
                <div className="resenha-trancada proximo-adiantar-trancado">
                  <IconeCadeado size={18} />
                  <span>
                    Adiantar a leitura dele libera quando você terminar{' '}
                    <strong>{livroAtual.titulo}</strong> (100%). Você está em {minhaPct}%.
                  </span>
                </div>
              )}
              <button className="btn btn-fantasma" onClick={promover} disabled={!!ocupado}>
                <IconeCoroa size={18} />
                {ocupado === 'promover'
                  ? entraNaSerie
                    ? 'Abrindo…'
                    : 'Trocando…'
                  : entraNaSerie
                    ? 'Abrir junto com a série'
                    : 'Tornar o livro do clube'}
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
              <strong>{livroAtual.titulo}</strong> — a corrida do livro atual não muda.
              {entraNaSerie ? (
                <>
                  {' '}
                  Como ele é da mesma série, abri-lo para o clube não encerra nada:
                  os dois ficam disponíveis e cada um lê no seu ritmo.
                </>
              ) : (
                <>
                  {' '}
                  Ao tornar este o livro do clube, o atual é arquivado no histórico
                  e todo mundo passa a correr por aqui.
                </>
              )}
            </p>
          </>
        )}
      </section>

      {foraDaFila.length > 0 && (
        <section className="painel proximo-fora">
          <h3 className="perfil-subtitulo" style={{ marginTop: 0 }}>
            <IconeSeta size={16} /> Fora da fila
          </h3>
          <p className="texto-tenue" style={{ marginTop: 0 }}>
            {foraDaFila.length === 1
              ? 'Este livro saiu da fila sem ter sido lido pelo clube.'
              : 'Estes livros saíram da fila sem terem sido lidos pelo clube.'}{' '}
            O que já foi marcado neles continua guardado; devolver à fila os põe
            no fim dela.
          </p>
          <div className="estante-pessoal-lista">
            {foraDaFila.map((livro) => (
              <article className="lido-item" key={livro.id}>
                {livro.capaUrl ? (
                  <img className="capinha" src={livro.capaUrl} alt={`Capa de ${livro.titulo}`} />
                ) : (
                  <div className="capinha capinha-vazia">
                    <IconeLivro size={18} />
                  </div>
                )}
                <div className="lido-dados">
                  <h4>{livro.titulo}</h4>
                  {livro.autor && <div className="autor">{livro.autor}</div>}
                </div>
                <button
                  className="btn btn-fantasma lido-acao"
                  onClick={() => devolver(livro)}
                  disabled={!!ocupado}
                >
                  {ocupado === `devolver-${livro.id}` ? 'Devolvendo…' : 'Devolver à fila'}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
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
        Ninguém marcou progresso neste livro ainda.
      </p>
    )
  }

  return (
    <ul className="fila-leitores">
      {lendo.map(({ membro, pct, faixas, cor }) => (
        <li className={`fila-leitor${membro.id === meuUserId ? ' eu' : ''}`} key={membro.id}>
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
            <div className="fila-barra" role="img" aria-label={`${membro.nome}: ${pct}%`}>
              <span
                className="fila-barra-base"
                style={{ width: `${faixas.base}%`, background: cor }}
              />
              <span className="fila-barra-recente" style={{ width: `${faixas.recente}%` }} />
            </div>
          </div>
          <span className="fila-pct">{pct}%</span>
        </li>
      ))}
    </ul>
  )
}
