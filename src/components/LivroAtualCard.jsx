import { rotuloSerie } from '../lib/series'
import { IconeLivro, IconeLivroAberto, IconePena, IconeMais } from './Icones'

// Card do livro em leitura, em destaque no topo — ou convite para cadastrar um.
//
// Quando o clube está numa série, este card mostra o volume ESCOLHIDO pelo
// membro (o seletor logo abaixo troca qual é), e diz de qual série ele é: sem
// isso, "O Prisioneiro do Céu" no topo e "O Jogo do Anjo" no de outra pessoa
// pareceriam dois clubes diferentes.
export default function LivroAtualCard({
  livro,
  quantosAbertos = 0,
  aoAbrirCadastro,
  aoEditar,
  aoAdicionarNaSerie,
  aoReabrir,
}) {
  if (!livro) {
    return (
      <section className="painel sem-livro">
        <div className="selo-secao centro" style={{ justifyContent: 'center' }}>
          <IconeLivroAberto size={40} />
        </div>
        <p>Nenhum livro em leitura no momento.</p>
        <button className="btn" onClick={aoAbrirCadastro}>
          <IconeLivro size={18} />
          Cadastrar livro do clube
        </button>
      </section>
    )
  }

  const serie = rotuloSerie(livro)
  // Volume que o clube encerrou, mas que continua na estante da série: dá para
  // reler as notas e a corrida dele — e, se foi encerrado cedo demais, devolvê-lo
  // à leitura.
  const encerrado = livro.ativo !== true

  return (
    <section className={`painel livro-atual${encerrado ? ' livro-encerrado' : ''}`}>
      {livro.capaUrl ? (
        <img className="capa" src={livro.capaUrl} alt={`Capa de ${livro.titulo}`} />
      ) : (
        <div className="capa capa-vazia">
          <IconeLivro size={40} />
        </div>
      )}
      <div className="info">
        <div className="selo-secao" style={{ fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          <IconeLivroAberto size={16} />{' '}
          {encerrado
            ? 'Volume encerrado'
            : quantosAbertos > 1
              ? 'Você está lendo'
              : 'Lendo agora'}
        </div>
        {serie && <div className="livro-serie">{serie}</div>}
        <h3>{livro.titulo}</h3>
        {livro.autor && <div className="autor">{livro.autor}</div>}
        {encerrado && (
          <p className="texto-tenue livro-encerrado-nota">
            O clube encerrou este volume — ele está no histórico. A corrida, as
            notas e as resenhas dele continuam aqui, inteiras.
          </p>
        )}
        <div className="livro-atual-acoes">
          {encerrado && aoReabrir && (
            <button className="btn-texto" onClick={aoReabrir}>
              <IconeLivroAberto size={14} />
              Reabrir este volume
            </button>
          )}
          {aoEditar && (
            <button className="btn-texto" onClick={aoEditar}>
              <IconePena size={14} />
              Corrigir dados do livro
            </button>
          )}
          {/* Só faz sentido oferecer o "mais um volume" a quem já tem série: é
              ela que autoriza dois livros abertos ao mesmo tempo. Com vários
              abertos o convite já está no seletor, e repetir aqui seria ruído. */}
          {!encerrado && aoAdicionarNaSerie && livro.serie && quantosAbertos < 2 && (
            <button className="btn-texto" onClick={aoAdicionarNaSerie}>
              <IconeMais size={14} />
              Abrir outro livro desta série
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
