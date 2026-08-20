import { pctDoProgresso } from '../lib/formato'
import { rotuloVolume } from '../lib/series'
import { IconeLivro, IconePilha, IconeMais } from './Icones'

// Quando o clube está lendo uma série, mais de um volume fica aberto ao mesmo
// tempo — porque é assim que uma série é lida de verdade: um já está no
// terceiro livro, outro ainda no segundo, e ninguém quer esperar. Este trilho
// é a chave que troca o volume que a tela toda está mostrando: a corrida, as
// notas parciais e o relógio do ciclo passam a ser os dele.
//
// A régua de cada pastilha é o progresso de QUEM ESTÁ OLHANDO, não o do clube:
// é ele que responde à pergunta que faz o membro clicar ali ("em qual eu
// estou?").
export default function SeletorLivros({
  livros,
  selecionadoId,
  meuProgressoPorLivro,
  progressoPorLivro,
  minhaCor,
  serie,
  aoSelecionar,
  aoAdicionar,
}) {
  if (livros.length < 2) return null

  return (
    <section className="painel seletor-livros">
      <div className="seletor-livros-topo">
        <h2 className="secao-titulo">
          <IconePilha size={20} /> {serie || 'Livros em leitura'}
        </h2>
        <p className="texto-suave">
          O clube está lendo {livros.length} livros desta série ao mesmo tempo.
          Escolha em qual <strong>você</strong> está — a corrida e as notas
          abaixo são sempre as do livro escolhido.
        </p>
      </div>

      <div className="livros-trilho" role="tablist" aria-label="Livros em leitura">
        {livros.map((livro) => {
          const minhaPct = pctDoProgresso(meuProgressoPorLivro[livro.id], 0)
          const leitores = Object.values(progressoPorLivro[livro.id] || {}).filter(
            (p) => pctDoProgresso(p, 0) > 0
          ).length
          const escolhido = livro.id === selecionadoId
          const volume = rotuloVolume(livro)
          return (
            <button
              key={livro.id}
              role="tab"
              aria-selected={escolhido}
              className={`livro-pastilha${escolhido ? ' ativa' : ''}`}
              onClick={() => aoSelecionar(livro.id)}
            >
              {livro.capaUrl ? (
                <img
                  className="livro-pastilha-capa"
                  src={livro.capaUrl}
                  alt=""
                  aria-hidden="true"
                />
              ) : (
                <span className="livro-pastilha-capa livro-pastilha-capa-vazia">
                  <IconeLivro size={16} />
                </span>
              )}
              <span className="livro-pastilha-dados">
                {volume && <span className="livro-pastilha-volume">{volume}</span>}
                <span className="livro-pastilha-titulo">{livro.titulo}</span>
                <span
                  className="livro-pastilha-regua"
                  role="img"
                  aria-label={`Você está em ${minhaPct}%`}
                >
                  <span
                    className="livro-pastilha-regua-cheio"
                    style={{ width: `${minhaPct}%`, background: minhaCor }}
                  />
                </span>
                <span className="livro-pastilha-meta">
                  você em {minhaPct}%
                  {leitores > 0 && (
                    <>
                      {' · '}
                      {leitores} {leitores === 1 ? 'leitor' : 'leitores'}
                    </>
                  )}
                </span>
              </span>
            </button>
          )
        })}

        {aoAdicionar && (
          <button
            type="button"
            className="livro-pastilha livro-pastilha-adicionar"
            onClick={aoAdicionar}
          >
            <IconeMais size={20} />
            <span>Adicionar outro livro da série</span>
          </button>
        )}
      </div>
    </section>
  )
}
