// Quem venceu a rodada de um livro.
//
// "Maior porcentagem" sozinho não decide nada: quando o clube inteiro chega
// aos 100%, todo mundo empata em 1º e a escolha acaba caindo em quem o banco
// devolveu primeiro — ou seja, no acaso. A corrida é uma corrida: entre quem
// chegou ao mesmo ponto, vence QUEM CHEGOU ANTES.
//
// A hora vem da trilha de marcações do progresso (`historico`), a mesma que
// pinta o dourado das últimas 24 h. Progresso antigo, gravado antes da trilha
// existir, cai no `atualizadoEm` do documento — impreciso, mas é o que há.

import { pctDoProgresso, emMilissegundos } from './formato'
import { ordenarHistorico } from './progresso24h'

// Quando este leitor alcançou a marca `alvo` pela primeira vez.
function quandoAlcancou(prog, alvo) {
  const marca = ordenarHistorico(prog?.historico).find((m) => m.pct >= alvo)
  if (marca) return marca.em
  const carimbo = emMilissegundos(prog?.atualizadoEm)
  // Sem trilha nem carimbo não dá para saber a hora: fica atrás de todos que
  // sabem dizer a sua, em vez de ganhar por sorte.
  return carimbo == null ? Number.POSITIVE_INFINITY : carimbo
}

// Recebe os documentos de progresso DE UM LIVRO e devolve
// `{ userId, pct, em }` — ou null, se ninguém chegou a marcar nada.
export function descobrirVencedor(progressos = [], totalPaginas = 0) {
  const comPct = progressos
    .map((prog) => ({ prog, pct: pctDoProgresso(prog, totalPaginas) }))
    .filter(({ pct }) => pct > 0)
  if (!comPct.length) return null

  const maiorPct = Math.max(...comPct.map(({ pct }) => pct))

  let vencedor = null
  comPct
    .filter(({ pct }) => pct === maiorPct)
    .forEach(({ prog }) => {
      const em = quandoAlcancou(prog, maiorPct)
      if (!vencedor || em < vencedor.em) {
        vencedor = { userId: prog.userId, pct: maiorPct, em }
      }
    })
  return vencedor
}

// Só o id, que é o que o histórico guarda.
export function vencedorUserId(progressos, totalPaginas) {
  return descobrirVencedor(progressos, totalPaginas)?.userId || ''
}
