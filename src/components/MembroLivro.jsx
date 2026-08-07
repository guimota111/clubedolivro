import { IconeCoroa } from './Icones'
import { inicial } from '../lib/formato'
import { useVerFoto } from './FotoContext'
import { variaveisDaCor } from '../lib/cores'

// Um "livro-termômetro" que representa o progresso de um membro.
// O livro se enche na cor escolhida pelo leitor; a faixa dourada na ponta é o
// que ele avançou nas últimas 24 h.
export default function MembroLivro({ membro, pct, faixas, cor, lider, souEu }) {
  const verFoto = useVerFoto()
  const recente = faixas?.recente || 0
  const base = faixas?.base ?? pct
  const rotulo =
    recente > 0
      ? `${membro.nome}: ${pct}% lido, sendo ${recente}% nas últimas 24 horas`
      : `${membro.nome}: ${pct}% lido`

  return (
    <div
      className={`membro-livro${lider ? ' lider' : ''}${souEu ? ' eu' : ''}`}
      style={variaveisDaCor(cor)}
    >
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

      <div className="livro-vasilha" role="img" aria-label={rotulo}>
        <div className="lombada" aria-hidden="true" />
        <div
          className="preenchimento"
          style={{ '--pct': `${base}%` }}
          aria-hidden="true"
        />
        {recente > 0 && (
          <div
            className="preenchimento-recente"
            style={{ '--base': `${base}%`, '--recente': `${recente}%` }}
            aria-hidden="true"
          />
        )}
        <div className="rotulo-pct">{pct}%</div>
      </div>

      <div className="textos-membro">
        <div className="nome-membro" title={membro.nome}>
          {membro.nome}
        </div>
        <div className="pagina-membro">
          {pct}% lido
          {recente > 0 && (
            <span className="ganho-24h" title="Lido nas últimas 24 h">
              +{recente}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
