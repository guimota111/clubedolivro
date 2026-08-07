// Reações (emoji) das notas parciais e como descrevê-las por extenso.
// As frases concordam com "Nota" (feminino): "Nota de Fulano <frase> em X%".

export const REACOES = ['😍', '🤯', '😲', '😢', '😂', '😡', '🤔', '😱', '❤️', '🔥', '👏', '💀']

const FRASE_REACAO = {
  '😍': 'apaixonante',
  '🤯': 'bombástica',
  '😲': 'surpreendente',
  '😢': 'de dar dó',
  '😂': 'hilária',
  '😡': 'de dar raiva',
  '🤔': 'intrigante',
  '😱': 'apavorante',
  '❤️': 'de amor',
  '🔥': 'escaldante',
  '👏': 'de aplausos',
  '💀': 'de matar',
}

// Frase da emoção para um emoji (string vazia se não houver mapeamento).
export function fraseReacao(emoji) {
  return FRASE_REACAO[emoji] || ''
}
