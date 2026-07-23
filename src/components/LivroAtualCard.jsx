import { IconeLivro, IconeLivroAberto, IconePena } from './Icones'

// Card do livro atual em destaque no topo — ou convite para cadastrar um.
export default function LivroAtualCard({ livro, aoAbrirCadastro, aoEditar }) {
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
          <IconeLivroAberto size={16} /> Lendo agora
        </div>
        <h3>{livro.titulo}</h3>
        {livro.autor && <div className="autor">{livro.autor}</div>}
        <div className="paginas selo-secao">
          <IconeLivro size={16} />
          {livro.totalPaginas} páginas
        </div>
        {aoEditar && (
          <button
            className="btn-texto"
            onClick={aoEditar}
            style={{ marginTop: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.35em' }}
          >
            <IconePena size={14} />
            Corrigir dados do livro
          </button>
        )}
      </div>
    </section>
  )
}
