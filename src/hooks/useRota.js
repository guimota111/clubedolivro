import { useCallback, useEffect, useState } from 'react'
import { lerRota, escreverRota, mesmaRota } from '../lib/rotas'

// A rota atual, lida do `#hash`, e uma função para trocar de tela.
//
// `navegar(rota)` grava no hash — e é o evento `hashchange` que atualiza o
// estado, de modo que o botão voltar e um link digitado passam pelo mesmo
// caminho que um clique no menu. `substituir: true` troca a entrada do
// histórico em vez de empilhar outra, para ajustes automáticos (a tela
// corrigindo um id que não existe mais) não encherem o voltar de passos
// que ninguém deu.
export function useRota() {
  const [rota, setRota] = useState(() => lerRota(window.location.hash))

  useEffect(() => {
    const aoMudar = () => setRota(lerRota(window.location.hash))
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])

  const navegar = useCallback((destino, { substituir = false } = {}) => {
    const nova = { ...lerRota(escreverRota(destino)) }
    const atual = lerRota(window.location.hash)
    if (mesmaRota(nova, atual)) return
    const hash = escreverRota(nova)
    if (substituir) {
      window.history.replaceState(null, '', hash)
      // `replaceState` não dispara `hashchange`: avisa o estado na mão.
      setRota(nova)
    } else {
      window.location.hash = hash
    }
  }, [])

  return { rota, navegar }
}
