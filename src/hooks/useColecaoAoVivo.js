import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'

// Assina uma query/coleção do Firestore em tempo real (onSnapshot).
// `montarQuery` deve retornar uma referência de Query ou Collection.
export function useColecaoAoVivo(montarQuery, deps = []) {
  const [docs, setDocs] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const q = montarQuery()
    if (!q) {
      setDocs([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setCarregando(false)
      },
      (err) => {
        console.error('Erro no onSnapshot:', err)
        setCarregando(false)
      }
    )
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { docs, carregando }
}
