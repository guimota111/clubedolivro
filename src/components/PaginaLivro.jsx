import PistaCorrida from './PistaCorrida'
import Estante from './Estante'
import RelogioCiclo from './RelogioCiclo'
import NotasParciais from './NotasParciais'
import { ResenhasDoLivro } from './Resenhas'
import { SubAbas } from './Menu'
import { IconeLivroAberto, IconeMarcador, IconePena } from './Icones'

// Tudo o que é de UM livro, em três sub-abas: a corrida (com o relógio do
// ciclo), as notas parciais e as resenhas.
//
// A mesma tela serve ao livro de agora e aos anteriores — é isso que deixa um
// retardatário continuar acompanhando um livro que o clube já encerrou no
// mesmo formato de corrida, em vez de uma lista morta. O que muda entre os
// dois é só o que vem de fora: o relógio (só faz sentido no livro em leitura)
// e os botões de trocar o livro (`acoesDaCorrida`).
export default function PaginaLivro({
  livro,
  sub,
  aoTrocarSub,
  userId,
  membros,
  porUsuario,
  notas,
  quantosAbertos = 1,
  membrosPorId,
  comentariosPorAlvo,
  resenhas = [],
  minhaPct,
  foco,
  vista,
  aoTrocarVista,
  mostrarRelogio = false,
  situacao = 'atual',
  acoesDaCorrida = null,
}) {
  if (!livro) return null

  const abas = [
    { chave: 'corrida', rotulo: 'Corrida', Icone: IconeLivroAberto },
    { chave: 'notas', rotulo: 'Notas', Icone: IconeMarcador, contagem: notas.length },
    { chave: 'resenhas', rotulo: 'Resenhas', Icone: IconePena, contagem: resenhas.length },
  ]

  return (
    <>
      <SubAbas itens={abas} ativa={sub} aoEscolher={aoTrocarSub} rotulo="Partes do livro" />

      {sub === 'corrida' && (
        <section id="foco-corrida-corrida" className="pagina-livro-corrida">
          {mostrarRelogio && <RelogioCiclo livro={livro} />}

          <h2 className="secao-titulo">
            <IconeLivroAberto size={22} /> A corrida da leitura
          </h2>
          {/* No desktop a pista sempre cabe. No celular o membro escolhe
              entre as barras (estante) e a pista de corrida. */}
          <div className="so-desktop">
            <PistaCorrida
              membros={membros}
              porUsuario={porUsuario}
              livro={livro}
              notas={notas}
              meuUserId={userId}
            />
          </div>
          <div className="so-mobile">
            <div className="seletor-modo seletor-vista" role="tablist" aria-label="Como ver o progresso">
              <button
                role="tab"
                aria-selected={vista === 'barras'}
                className={`seletor-opcao${vista === 'barras' ? ' ativo' : ''}`}
                onClick={() => aoTrocarVista('barras')}
              >
                Barras
              </button>
              <button
                role="tab"
                aria-selected={vista === 'corrida'}
                className={`seletor-opcao${vista === 'corrida' ? ' ativo' : ''}`}
                onClick={() => aoTrocarVista('corrida')}
              >
                Corrida
              </button>
            </div>

            {vista === 'corrida' ? (
              <PistaCorrida
                membros={membros}
                porUsuario={porUsuario}
                livro={livro}
                notas={notas}
                meuUserId={userId}
              />
            ) : (
              <Estante membros={membros} porUsuario={porUsuario} livro={livro} meuUserId={userId} />
            )}
          </div>

          {acoesDaCorrida}
        </section>
      )}

      {sub === 'notas' && (
        <NotasParciais
          userId={userId}
          livro={livro}
          quantosAbertos={quantosAbertos}
          notas={notas}
          comentariosPorAlvo={comentariosPorAlvo}
          membrosPorId={membrosPorId}
          minhaPct={minhaPct}
          foco={foco}
        />
      )}

      {sub === 'resenhas' && (
        <ResenhasDoLivro
          livro={livro}
          situacao={situacao}
          userId={userId}
          minhaPct={minhaPct}
          resenhas={resenhas}
          comentariosPorAlvo={comentariosPorAlvo}
          membrosPorId={membrosPorId}
          foco={foco}
        />
      )}
    </>
  )
}
