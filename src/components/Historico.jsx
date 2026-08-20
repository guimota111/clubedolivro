import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { formatarData, inicial } from '../lib/formato'
import { rotuloSerie } from '../lib/series'
import { IconeLivro, IconeCoroa } from './Icones'
import { useVerFoto } from './FotoContext'

// Histórico dos livros já lidos, com o vencedor de cada rodada.
export default function Historico({ membrosPorId }) {
  const verFoto = useVerFoto()
  const [itens, setItens] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'historicoLivros'), orderBy('encerradoEm', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => setItens(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Erro no histórico:', err)
    )
    return unsub
  }, [])

  if (!itens.length) return null

  return (
    <section className="painel">
      <h2 className="secao-titulo">
        <IconeLivro size={22} /> Livros já lidos
      </h2>
      <div className="historico-lista">
        {itens.map((livro) => {
          const vencedor = membrosPorId[livro.vencedorUserId]
          return (
            <div className="historico-item" key={livro.id}>
              {livro.capaUrl ? (
                <img className="capinha" src={livro.capaUrl} alt={`Capa de ${livro.titulo}`} />
              ) : (
                <div
                  className="capinha"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--papel-tenue)' }}
                >
                  <IconeLivro size={18} />
                </div>
              )}
              <div className="dados">
                {rotuloSerie(livro) && (
                  <div className="livro-serie">{rotuloSerie(livro)}</div>
                )}
                <h4>{livro.titulo}</h4>
                <div className="meta">
                  {livro.autor ? `${livro.autor} · ` : ''}
                  encerrado {formatarData(livro.encerradoEm)}
                </div>
              </div>
              {vencedor && (
                <div className="vencedor" title={`Venceu: ${vencedor.nome}`}>
                  <IconeCoroa size={18} />
                  {vencedor.avatarUrl ? (
                    <img
                      src={vencedor.avatarUrl}
                      alt={vencedor.nome}
                      className="avatar-clicavel"
                      onClick={() => verFoto(vencedor.avatarUrl, vencedor.nome)}
                    />
                  ) : (
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--madeira-clara)',
                        border: '2px solid var(--dourado)',
                        color: 'var(--dourado-claro)',
                      }}
                    >
                      {inicial(vencedor.nome)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
