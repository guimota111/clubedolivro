// Identidade sem autenticação: um UUID persistido no localStorage do navegador.
const STORAGE_KEY = 'clubedolivro:userId'

function gerarUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback simples para navegadores antigos.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Retorna o userId existente ou cria e persiste um novo.
export function obterOuCriarUserId() {
  let id = null
  try {
    id = localStorage.getItem(STORAGE_KEY)
  } catch {
    id = null
  }
  if (!id) {
    id = gerarUuid()
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // localStorage indisponível (modo privado); segue com id em memória.
    }
  }
  return id
}

export function obterUserId() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// Define explicitamente o userId (usado ao entrar como um membro já existente,
// por exemplo em outro dispositivo).
export function definirUserId(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignora
  }
}

// Limpa a identidade local — volta para o cadastro.
export function limparIdentidade() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignora
  }
}
