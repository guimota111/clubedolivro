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

  return (
    <section className="painel livro-atual">
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
          {quantosAbertos > 1 ? 'Você está lendo' : 'Lendo agora'}
        </div>
        {serie && <div className="livro-serie">{serie}</div>}
        <h3>{livro.titulo}</h3>
        {livro.autor && <div className="autor">{livro.autor}</div>}
        <div className="livro-atual-acoes">
          {aoEditar && (
            <button className="btn-texto" onClick={aoEditar}>
              <IconePena size={14} />
              Corrigir dados do livro
            </button>
          )}
          {/* Só faz sentido oferecer o "mais um volume" a quem já tem série: é
              ela que autoriza dois livros abertos ao mesmo tempo. Com vários
              abertos o convite já está no seletor, e repetir aqui seria ruído. */}
          {aoAdicionarNaSerie && livro.serie && quantosAbertos < 2 && (
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
