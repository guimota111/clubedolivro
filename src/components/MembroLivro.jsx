import { IconeCoroa } from './Icones'
import { inicial } from '../lib/formato'
import { useVerFoto } from './FotoContext'

// Um "livro-termômetro" que representa o progresso de um membro.
export default function MembroLivro({ membro, pct, paginaAtual, totalPaginas, lider, souEu }) {
  const verFoto = useVerFoto()
  return (
    <div className={`membro-livro${lider ? ' lider' : ''}${souEu ? ' eu' : ''}`}>
      <div className="avatar-marcador">
        {lider && (
          <IconeCoroa size={26} className="coroa" aria-label="1º lugar" />
        )}
        {membro.avatarUrl ? (
          <img
            src={membro.avatarUrl}
            alt={membro.nome}
            className="avatar-clicavel"
            onClick={() => verFoto(membro.avatarUrl, membro.nome)}
          />
        ) : (
          <div className="avatar-placeholder">{inicial(membro.nome)}</div>
        )}
      </div>

      <div
        className="livro-vasilha"
        style={{ '--pct': `${pct}%` }}
        role="img"
        aria-label={`${membro.nome}: ${pct}% lido`}
      >
        <div className="lombada" aria-hidden="true" />
        <div className="preenchimento" aria-hidden="true" />
        <div className="rotulo-pct">{pct}%</div>
      </div>

      <div className="textos-membro">
        <div className="nome-membro" title={membro.nome}>
          {membro.nome}
        </div>
        <div className="pagina-membro">
          pág. {paginaAtual} de {totalPaginas}
        </div>
      </div>
    </div>
  )
}
