import { useEffect, useState } from 'react'
import {
  prazoParaData,
  inicioDoLivro,
  contagemRegressiva,
  tempoDecorrido,
} from '../lib/formato'

// Relógio do ciclo do livro, com dois modos: quanto FALTA até a data-limite e
// há quanto tempo a leitura COMEÇOU. Tocar no relógio troca de um para o
// outro — de propósito sem nenhum aviso na tela; quem descobre, descobre (a
// dica fica no changelog). A escolha fica guardada neste navegador.
const CHAVE_MODO = 'clubedolivro:relogio-modo'

export default function RelogioCiclo({ livro }) {
  const alvo = prazoParaData(livro?.dataLimite)
  const inicio = inicioDoLivro(livro)

  const [modo, setModo] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_MODO) === 'decorrido' ? 'decorrido' : 'restante'
    } catch {
      return 'restante'
    }
  })
  const [agora, setAgora] = useState(() => new Date())

  // Sem data-limite só existe o tempo decorrido; sem início, só o restante.
  const modoEfetivo = !alvo ? 'decorrido' : !inicio ? 'restante' : modo
  const podeTrocar = !!alvo && !!inicio

  useEffect(() => {
    if (!alvo && !inicio) return
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [livro?.dataLimite, livro?.dataInicio]) // eslint-disable-line react-hooks/exhaustive-deps

  function trocar() {
    if (!podeTrocar) return
    const novo = modoEfetivo === 'restante' ? 'decorrido' : 'restante'
    setModo(novo)
    try {
      localStorage.setItem(CHAVE_MODO, novo)
    } catch {
      // navegador sem localStorage: a escolha só não sobrevive ao recarregar
    }
  }

  if (!alvo && !inicio) return null

  const decorrido = modoEfetivo === 'decorrido'
  const c = decorrido ? tempoDecorrido(inicio, agora) : contagemRegressiva(alvo, agora)
  const dataFmt = formatar(decorrido ? inicio : alvo)

  const vencido = !decorrido && c.vencido
  const titulo = decorrido ? 'Lendo há' : 'Para terminar a leitura'
  const rodape = decorrido ? `desde ${dataFmt}` : `até ${dataFmt}`

  const conteudo = vencido ? (
    <>
      <span className="contador-titulo">Prazo encerrado</span>
      <span className="contador-sub">A data-limite ({dataFmt}) já passou.</span>
    </>
  ) : (
    <>
      <span className="contador-titulo">{titulo}</span>
      <div className="contador-relogio">
        {[
          { valor: c.dias, rotulo: c.dias === 1 ? 'dia' : 'dias' },
          { valor: c.horas, rotulo: 'h' },
          { valor: c.minutos, rotulo: 'min' },
          { valor: c.segundos, rotulo: 'seg' },
        ].map((u, i) => (
          <div className="contador-bloco" key={i}>
            <span className="contador-num">{String(u.valor).padStart(2, '0')}</span>
            <span className="contador-rot">{u.rotulo}</span>
          </div>
        ))}
      </div>
      <span className="contador-sub">{rodape}</span>
    </>
  )

  const classe = `contador${vencido ? ' contador-vencido' : ''}`

  // Sem os dois lados não há o que alternar: vira um bloco comum, sem o
  // cursor de clique prometendo algo que não acontece.
  if (!podeTrocar) {
    return (
      <div className={classe} role="status">
        {conteudo}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`${classe} contador-alternavel`}
      onClick={trocar}
      aria-live="polite"
      aria-label={
        decorrido
          ? `Lendo há ${c.dias} dias. Toque para ver quanto falta para o prazo.`
          : `Faltam ${c.dias} dias para o prazo. Toque para ver há quanto tempo a leitura começou.`
      }
    >
      {conteudo}
    </button>
  )
}

function formatar(data) {
  if (!data) return ''
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
