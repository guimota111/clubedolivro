import { pctDoProgresso } from '../lib/formato'
import { rotuloVolume } from '../lib/series'
import { IconeLivro, IconePilha } from './Icones'

// O trilho dos livros que o clube já encerrou. Escolher um deles abre a
// mesma página do livro atual — corrida, notas e resenhas — só que daquele
// livro: quem ficou para trás continua a sua corrida ali, e quem terminou
// relê a conversa.
//
// A régua de cada pastilha é o progresso de QUEM ESTÁ OLHANDO — é ela que
// diz ao retardatário onde ele parou.
export default function LivrosAnteriores({
  livros,
  selecionadoId,
  meuProgressoPorLivro,
  progressoPorLivro,
  minhaCor,
  aoSelecionar,
}) {
  if (!livros.length) {
    return (
      <section className="painel centro estante-pessoal-vazia">
        <div className="selo-secao" style={{ justifyContent: 'center' }}>
          <IconePilha size={40} />
        </div>
        <p className="texto-suave">
          O clube ainda não encerrou nenhum livro. Quando o primeiro for
          arquivado, ele continua por aqui — com a corrida, as notas e as
          resenhas inteiras, para quem quiser terminar depois.
        </p>
      </section>
    )
  }

  return (
    <section className="painel seletor-livros">
      <div className="seletor-livros-topo">
        <h2 className="secao-titulo">
          <IconePilha size={20} /> Livros anteriores
        </h2>
        <p className="texto-suave">
          {livros.length === 1
            ? 'O clube já encerrou 1 livro.'
            : `O clube já encerrou ${livros.length} livros.`}{' '}
          Escolha um para ver a corrida dele, as notas e as resenhas — e, se
          você ficou para trás, continue a sua leitura por aqui.
        </p>
      </div>

      <div className="livros-trilho" role="tablist" aria-label="Livros anteriores">
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
                <img className="livro-pastilha-capa" src={livro.capaUrl} alt="" aria-hidden="true" />
              ) : (
                <span className="livro-pastilha-capa livro-pastilha-capa-vazia">
                  <IconeLivro size={16} />
                </span>
              )}
              <span className="livro-pastilha-dados">
                {(volume || livro.serie) && (
                  <span className="livro-pastilha-volume">
                    {livro.serie}
                    {volume ? ` · ${volume}` : ''}
                  </span>
                )}
                <span className="livro-pastilha-titulo">{livro.titulo}</span>
                <span className="livro-pastilha-regua" role="img" aria-label={`Você está em ${minhaPct}%`}>
                  <span
                    className="livro-pastilha-regua-cheio"
                    style={{ width: `${minhaPct}%`, background: minhaCor }}
                  />
                </span>
                <span className="livro-pastilha-meta">
                  {minhaPct >= 100 ? 'você terminou' : `você em ${minhaPct}%`}
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
      </div>
    </section>
  )
}
