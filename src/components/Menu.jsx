import { useEffect, useRef } from 'react'
import { IconeSino } from './Icones'

// O menu principal do site: uma tela por item, cada uma com o seu assunto.
//
// Fica grudado no topo enquanto a página rola — no celular, com sete itens,
// ele rola de lado; o item ativo é trazido para a vista quando muda. Os
// itens chegam prontos (`chave`, `rotulo`, `Icone`), e quem decide o que
// cada um abre é o App, pela rota.
export default function Menu({ itens, ativo, aoEscolher }) {
  const trilho = useRef(null)

  // Quando a tela muda (pelo menu, por um aviso ou pelo voltar), o item ativo
  // vem para o meio do trilho — só o trilho rola, nunca a página.
  useEffect(() => {
    const el = trilho.current?.querySelector('.menu-item.ativo')
    if (!el || !trilho.current) return
    const caixa = trilho.current
    const alvo = el.offsetLeft - (caixa.clientWidth - el.offsetWidth) / 2
    caixa.scrollTo({ left: Math.max(0, alvo), behavior: 'smooth' })
  }, [ativo])

  return (
    <nav className="menu" aria-label="Seções do clube">
      <div className="menu-trilho container" ref={trilho}>
        {itens.map(({ chave, rotulo, Icone, selo }) => {
          const estaAtivo = chave === ativo
          return (
            <button
              key={chave}
              type="button"
              className={`menu-item${estaAtivo ? ' ativo' : ''}`}
              aria-current={estaAtivo ? 'page' : undefined}
              onClick={() => aoEscolher(chave)}
            >
              <Icone size={20} aria-hidden="true" />
              <span className="menu-rotulo">{rotulo}</span>
              {selo > 0 && (
                <span className="menu-selo" aria-label={`${selo} novidades`}>
                  {selo > 9 ? '9+' : selo}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// O sininho do cabeçalho: abre as novidades e conta o que chegou desde a
// última visita.
export function SinoNovidades({ naoVistas = 0, ativo = false, onClick }) {
  return (
    <button
      type="button"
      className={`sino${ativo ? ' ativo' : ''}${naoVistas > 0 ? ' com-novidades' : ''}`}
      onClick={onClick}
      aria-label={
        naoVistas > 0
          ? `Novidades: ${naoVistas} ${naoVistas === 1 ? 'nova' : 'novas'}`
          : 'Novidades'
      }
      title="Novidades"
    >
      <IconeSino size={22} />
      {naoVistas > 0 && (
        <span className="sino-selo" aria-hidden="true">
          {naoVistas > 9 ? '9+' : naoVistas}
        </span>
      )}
    </button>
  )
}

// As sub-abas de uma página (a corrida, as notas, as resenhas de um livro).
export function SubAbas({ itens, ativa, aoEscolher, rotulo = 'Seções' }) {
  return (
    <nav className="abas sub-abas" role="tablist" aria-label={rotulo}>
      {itens.map(({ chave, rotulo: texto, Icone, contagem }) => (
        <button
          key={chave}
          type="button"
          role="tab"
          aria-selected={ativa === chave}
          className={`aba${ativa === chave ? ' ativa' : ''}`}
          onClick={() => aoEscolher(chave)}
        >
          {Icone && <Icone size={18} />} {texto}
          {contagem > 0 && <span className="aba-contagem">{contagem}</span>}
        </button>
      ))}
    </nav>
  )
}
