import { formatarData, inicial } from '../lib/formato'
import { corDoMembro } from '../lib/cores'
import { useVerFoto } from './FotoContext'
import { IconeSino, IconeSeta, DivisoriaOrnamentada } from './Icones'

// Aba de novidades: o que o clube andou fazendo, do mais recente ao mais
// antigo. A lista chega pronta de `montarAtividades` — aqui só se desenha.
//
// Cada aviso leva ao que ele conta: a nota, a resenha ou a corrida. Quando o
// destino não existe para quem está olhando (uma resenha de livro que essa
// pessoa ainda não terminou, por exemplo), o aviso vira texto simples em vez
// de um botão que não faz nada.
export default function Atividades({ atividades, membrosPorId, vistoAte, aoIrPara }) {
  const verFoto = useVerFoto()

  return (
    <section className="painel">
      <h2 className="secao-titulo">
        <IconeSino size={22} /> Novidades
      </h2>
      <DivisoriaOrnamentada
        style={{ width: '55%', height: 14, margin: '0 auto 1rem', color: 'var(--dourado)', opacity: 0.7 }}
      />

      {!atividades.length ? (
        <p className="texto-suave centro" style={{ marginTop: 0 }}>
          Ainda não aconteceu nada por aqui. Atualize seu progresso ou deixe uma
          reação numa página do livro.
        </p>
      ) : (
        <ul className="atividades">
          {atividades.map((a) => {
            const autor = membrosPorId[a.userId]
            const nova = vistoAte != null && a.em > vistoAte
            const quando = formatarData(new Date(a.em))
            return (
              <li className={`atividade${nova ? ' atividade-nova' : ''}`} key={a.id}>
                {/* O retrato fica fora do botão: ele abre a foto grande, e um
                    clicável dentro de outro seria ambíguo (e HTML inválido). */}
                <span
                  className="atividade-avatar"
                  style={{ '--cor-membro': corDoMembro(autor || { id: a.userId }) }}
                >
                  {autor?.avatarUrl ? (
                    <img
                      src={autor.avatarUrl}
                      alt={autor.nome || ''}
                      className="avatar-clicavel"
                      onClick={() => verFoto(autor.avatarUrl, autor.nome)}
                    />
                  ) : (
                    <span className="atividade-inicial">{inicial(autor?.nome)}</span>
                  )}
                  {a.emoji && (
                    <span className="atividade-emoji" aria-hidden="true">{a.emoji}</span>
                  )}
                </span>

                {a.destino ? (
                  <button
                    type="button"
                    className="atividade-corpo atividade-link"
                    onClick={() => aoIrPara(a.destino)}
                  >
                    <span className="atividade-texto">{a.texto}</span>
                    <span className="atividade-quando">{quando}</span>
                    <IconeSeta
                      size={15}
                      className="atividade-seta"
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <div className="atividade-corpo">
                    <p className="atividade-texto">{a.texto}</p>
                    <span className="atividade-quando">{quando}</span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
