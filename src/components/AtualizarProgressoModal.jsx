import { useState } from 'react'
import Modal from './Modal'
import { salvarProgresso } from '../lib/db'
import { anunciar, meuNome } from '../lib/push'
import { textoDoProgresso } from '../lib/atividades'
import { limitarPct, calcularPct, pctDoProgresso } from '../lib/formato'
import { montarHistorico, faixasDeProgresso } from '../lib/progresso24h'
import { IconeMarcador } from './Icones'

// Modal para o membro informar quanto já leu. Ele escolhe entre:
//  • Porcentagem  — direto no slider (bom para quem lê no Kindle/e-book).
//  • Página       — página atual + total de páginas da SUA edição, que a gente
//                   converte em %. Assim físico e Kindle (com contagens
//                   diferentes) ficam comparáveis na mesma estante.
export default function AtualizarProgressoModal({
  userId,
  livro,
  porcentagemInicial,
  progressoAtual,
  onFechar,
}) {
  // Começa no modo que o membro usou da última vez (se houver).
  const [modo, setModo] = useState(
    progressoAtual?.modo === 'pagina' ? 'pagina' : 'porcentagem'
  )
  const [pct, setPct] = useState(limitarPct(porcentagemInicial || 0))
  const [pagina, setPagina] = useState(
    progressoAtual?.paginaAtual != null ? String(progressoAtual.paginaAtual) : ''
  )
  const [totalPag, setTotalPag] = useState(
    progressoAtual?.totalPaginas != null ? String(progressoAtual.totalPaginas) : ''
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // % que já está gravada (base para o histórico) e o quanto dela veio das
  // últimas 24 h — usado no aviso abaixo do formulário.
  const pctSalva = pctDoProgresso(progressoAtual, livro?.totalPaginas)
  const faixasSalvas = faixasDeProgresso(progressoAtual, pctSalva)

  const paginaNum = Number(pagina)
  const totalNum = Number(totalPag)
  const totalValido = totalNum > 0
  // Prévia da porcentagem calculada a partir das páginas.
  const pctCalculada = totalValido
    ? calcularPct(Math.min(paginaNum, totalNum), totalNum)
    : 0

  async function aoEnviar(e) {
    e.preventDefault()
    setErro('')

    let dados
    if (modo === 'pagina') {
      if (!totalValido) {
        setErro('Informe o total de páginas da sua edição.')
        return
      }
      if (!(paginaNum >= 0)) {
        setErro('Informe a página em que você está.')
        return
      }
      const paginaLimitada = Math.min(Math.max(0, Math.round(paginaNum)), totalNum)
      dados = {
        porcentagem: calcularPct(paginaLimitada, totalNum),
        paginaAtual: paginaLimitada,
        totalPaginas: Math.round(totalNum),
        modo: 'pagina',
      }
    } else {
      dados = { porcentagem: limitarPct(pct), modo: 'porcentagem' }
    }

    // Marca a posição no histórico para saber, depois, o que foi lido nas
    // últimas 24 h (a faixa dourada das barras).
    dados.historico = montarHistorico(
      progressoAtual?.historico,
      progressoAtual ? pctSalva : null,
      dados.porcentagem
    )

    setSalvando(true)
    try {
      await salvarProgresso(userId, livro.id, dados)
      // Avanço comum não avisa: quem marca 12%, 15%, 20% num domingo encheria
      // o celular de todo mundo. A chegada aos 100%, sim — é o momento que o
      // clube comemora, e só acontece uma vez por livro.
      if (dados.porcentagem >= 100 && pctSalva < 100) {
        anunciar(
          `progresso-${userId}_${livro.id}`,
          textoDoProgresso(meuNome(), 100, { titulo: livro.titulo })
        )
      }
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível salvar. Tente novamente.')
      setSalvando(false)
    }
  }

  return (
    <Modal titulo="Meu progresso" onFechar={onFechar}>
      <p className="texto-suave" style={{ marginTop: 0 }}>
        Lendo <strong>{livro?.titulo}</strong>. Registre por porcentagem ou por
        página — cada um usa o que combina com a sua edição.
      </p>

      {/* Seletor entre os dois jeitos de informar. */}
      <div className="seletor-modo" role="tablist" aria-label="Como informar o progresso">
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'porcentagem'}
          className={`seletor-opcao${modo === 'porcentagem' ? ' ativo' : ''}`}
          onClick={() => setModo('porcentagem')}
        >
          Porcentagem
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'pagina'}
          className={`seletor-opcao${modo === 'pagina' ? ' ativo' : ''}`}
          onClick={() => setModo('pagina')}
        >
          Página
        </button>
      </div>

      <form onSubmit={aoEnviar}>
        {modo === 'porcentagem' ? (
          <>
            <div
              className="pct-grande"
              style={{ margin: '0.6rem 0 0.2rem' }}
              aria-hidden="true"
            >
              {limitarPct(pct)}
              <span className="pct-simbolo">%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="slider-pct"
              aria-label="Porcentagem lida"
              style={{ '--pct': `${limitarPct(pct)}%` }}
            />

            <div className="campo" style={{ marginTop: '1rem' }}>
              <label htmlFor="pct-num">Ou digite a porcentagem exata</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="pct-num"
                  type="number"
                  min="0"
                  max="100"
                  value={pct}
                  onChange={(e) => setPct(e.target.value === '' ? 0 : Number(e.target.value))}
                  style={{ maxWidth: 120 }}
                />
                <span className="texto-suave" style={{ fontSize: '1.2rem' }}>
                  %
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="pct-grande" style={{ margin: '0.6rem 0 0.2rem' }} aria-hidden="true">
              {pctCalculada}
              <span className="pct-simbolo">%</span>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <div className="campo" style={{ flex: '1 1 120px', margin: 0 }}>
                <label htmlFor="pagina-atual">Página atual</label>
                <input
                  id="pagina-atual"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={pagina}
                  placeholder="Ex.: 84"
                  onChange={(e) => setPagina(e.target.value)}
                />
              </div>
              <div className="campo" style={{ flex: '1 1 120px', margin: 0 }}>
                <label htmlFor="total-paginas">Total (sua edição)</label>
                <input
                  id="total-paginas"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={totalPag}
                  placeholder="Ex.: 256"
                  onChange={(e) => setTotalPag(e.target.value)}
                />
              </div>
            </div>
            <p className="texto-suave" style={{ fontSize: '0.85rem', marginTop: '0.6rem' }}>
              Use o total de páginas da <strong>sua</strong> edição (Kindle e
              físico costumam ser diferentes). A gente converte em % para todo
              mundo aparecer na mesma régua.
            </p>
          </>
        )}

        <p className="texto-tenue nota-24h">
          {faixasSalvas.recente > 0 ? (
            <>
              Nas últimas 24 h você já avançou{' '}
              <strong>{faixasSalvas.recente}%</strong> — é o trecho dourado da
              sua barra.
            </>
          ) : (
            <>
              O que você avançar nas próximas 24 h aparece em{' '}
              <strong>dourado</strong> na sua barra; o resto fica na sua cor.
            </>
          )}
        </p>

        {erro && <div className="erro">{erro}</div>}

        <button className="btn" type="submit" disabled={salvando} style={{ width: '100%', marginTop: '1rem' }}>
          <IconeMarcador size={18} />
          {salvando ? 'Salvando…' : 'Atualizar posição na estante'}
        </button>
      </form>
    </Modal>
  )
}
