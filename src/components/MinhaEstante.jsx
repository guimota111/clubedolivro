import { useMemo } from 'react'
import {
  pctDoProgresso,
  formatarData,
  emMilissegundos,
} from '../lib/formato'
import { quandoTerminou } from '../lib/progresso24h'
import { IconePilha, IconeLivro, IconePena } from './Icones'

// Aba "Já li": a estante pessoal do membro — os livros do clube que ELE levou
// até o fim (100%), do mais recente ao mais antigo.
//
// Um livro entra aqui pelo progresso do próprio leitor, não pelo calendário do
// clube: quem terminou o livro de agora já o vê na estante, e quem nunca
// chegou ao fim de um livro encerrado não o vê — o histórico do clube, esse
// sim coletivo, continua na aba de leitura.
export default function MinhaEstante({
  livroAtual,
  proximo,
  historico,
  meuProgressoPorLivro,
  resenhasPorLivro,
  userId,
  aoVerResenhas,
}) {
  const lidos = useMemo(() => {
    const candidatos = []
    const vistos = new Set()
    const juntar = (livro, situacao, encerradoEm) => {
      if (!livro || vistos.has(livro.id)) return
      vistos.add(livro.id)
      candidatos.push({
        id: livro.id,
        titulo: livro.titulo,
        autor: livro.autor,
        capaUrl: livro.capaUrl,
        situacao,
        encerradoEm,
      })
    }

    juntar(livroAtual, 'atual')
    juntar(proximo, 'fila')
    historico.forEach((h) => juntar(h, 'encerrado', h.encerradoEm))

    return candidatos
      .map((livro) => {
        const prog = meuProgressoPorLivro[livro.id]
        return {
          ...livro,
          pct: pctDoProgresso(prog, 0),
          // A trilha de marcações sabe o dia exato em que a pessoa cruzou os
          // 100%. Progresso antigo não tem trilha: aí vale a última alteração.
          terminadoEm: quandoTerminou(prog) || prog?.atualizadoEm || null,
        }
      })
      .filter((livro) => livro.pct >= 100)
      .sort(
        (a, b) =>
          (emMilissegundos(b.terminadoEm) || 0) -
          (emMilissegundos(a.terminadoEm) || 0)
      )
  }, [livroAtual, proximo, historico, meuProgressoPorLivro])

  if (!lidos.length) {
    return (
      <section className="painel centro estante-pessoal-vazia">
        <div className="selo-secao" style={{ justifyContent: 'center' }}>
          <IconePilha size={40} />
        </div>
        <p className="texto-suave">
          Sua estante ainda está vazia. Assim que você cruzar os 100% de um livro
          do clube, ele aparece aqui — com a data em que você terminou e a sua
          resenha.
        </p>
      </section>
    )
  }

  return (
    <section className="painel estante-pessoal">
      <h2 className="secao-titulo">
        <IconePilha size={22} /> Livros que você já leu
      </h2>
      <p className="texto-suave" style={{ marginTop: 0 }}>
        {lidos.length === 1
          ? 'Você já terminou 1 livro com o clube.'
          : `Você já terminou ${lidos.length} livros com o clube.`}
      </p>

      <div className="estante-pessoal-lista">
        {lidos.map((livro) => {
          const minhaResenha = (resenhasPorLivro[livro.id] || []).find(
            (r) => r.userId === userId
          )
          // Carimbo do servidor recém-gravado ainda chega vazio ao navegador —
          // aí a frase vai sem data em vez de terminar no meio.
          const quandoTerminei = formatarData(livro.terminadoEm)
          const quandoEncerrou = formatarData(livro.encerradoEm)
          return (
            <article className="lido-item" key={livro.id}>
              {livro.capaUrl ? (
                <img
                  className="capinha"
                  src={livro.capaUrl}
                  alt={`Capa de ${livro.titulo}`}
                />
              ) : (
                <div className="capinha capinha-vazia">
                  <IconeLivro size={18} />
                </div>
              )}

              <div className="lido-dados">
                <h4>{livro.titulo}</h4>
                {livro.autor && <div className="autor">{livro.autor}</div>}

                <div className="lido-meta">
                  {quandoTerminei
                    ? `Você terminou ${quandoTerminei}`
                    : 'Terminado por você'}
                  {livro.situacao === 'encerrado' && quandoEncerrou && (
                    <> · o clube encerrou {quandoEncerrou}</>
                  )}
                </div>

                <div className="lido-selos">
                  {livro.situacao === 'atual' && (
                    <span className="resenha-selo selo-atual">
                      Livro do clube agora
                    </span>
                  )}
                  {livro.situacao === 'fila' && (
                    <span className="resenha-selo selo-fila">Na fila</span>
                  )}
                  {minhaResenha?.nota > 0 && (
                    <span
                      className="lido-nota"
                      aria-label={`Sua nota: ${minhaResenha.nota} de 5`}
                    >
                      {'★'.repeat(Math.min(5, minhaResenha.nota))}
                      <span className="lido-nota-vazia">
                        {'★'.repeat(Math.max(0, 5 - minhaResenha.nota))}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <button
                className="btn btn-fantasma lido-acao"
                onClick={() => aoVerResenhas(livro.id)}
              >
                <IconePena size={16} />
                {minhaResenha ? 'Ver sua resenha' : 'Resenhar'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
