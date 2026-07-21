import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

// Faz upload de uma imagem para uma pasta do Firebase Storage e devolve a URL pública.
export async function enviarImagem(pasta, arquivo, nomeBase) {
  const extensao = (arquivo.name?.split('.').pop() || 'jpg').toLowerCase()
  const nome = `${nomeBase}-${Date.now()}.${extensao}`
  const caminho = `${pasta}/${nome}`
  const referencia = ref(storage, caminho)
  await uploadBytes(referencia, arquivo, { contentType: arquivo.type })
  return await getDownloadURL(referencia)
}
