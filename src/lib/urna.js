// A urna da eleição: quem abre, apura e encerra precisa da senha.
//
// O app não tem servidor nem login, então a conferência acontece aqui, no
// navegador: o que o membro digita é resumido com SHA-256 e comparado ao
// resumo gravado abaixo. A senha em si não está em lugar nenhum do código —
// só quem a recebeu de quem administra o clube consegue abrir a urna.
//
// Como todo o resto do app, isto é experiência, não segurança: quem sabe
// programar consegue contornar. Serve para a apuração acontecer num momento
// só, na frente de todo mundo, em vez de alguém encerrar a eleição sem querer.

// SHA-256 (hex) da senha da urna. Para trocar a senha, gere um novo resumo:
//   node -e "console.log(require('crypto').createHash('sha256').update('NOVA SENHA','utf8').digest('hex'))"
const RESUMO_DA_SENHA = 'efb222a0958b2e3424045dcfa3076a7ebb711f6dcf7f8197b96799c343795a92'

async function resumir(texto) {
  const bytes = new TextEncoder().encode(texto)
  const resumo = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(resumo))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// A senha confere? Aceita espaço sobrando nas pontas; o resto é exato.
export async function conferirSenhaDaUrna(senha) {
  const limpa = (senha || '').trim()
  if (!limpa) return false
  try {
    return (await resumir(limpa)) === RESUMO_DA_SENHA
  } catch {
    // Sem `crypto.subtle` (página fora de HTTPS) não há como conferir.
    return false
  }
}
