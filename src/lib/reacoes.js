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

// A mesma emoção contada como ação de quem leu — é o que o aviso de novidades
// usa: "Monique se surpreendeu na página 200".
//
// Todas em forma neutra de propósito: o clube não guarda gênero de ninguém, e
// "ficou surpreso(a)" fica feio. Por isso "levou um susto" e não "assustado".
const VERBO_REACAO = {
  '😍': 'se apaixonou',
  '🤯': 'surtou',
  '😲': 'se surpreendeu',
  '😢': 'se emocionou',
  '😂': 'deu risada',
  '😡': 'ficou com raiva',
  '🤔': 'ficou na dúvida',
  '😱': 'levou um susto',
  '❤️': 'se derreteu',
  '🔥': 'se empolgou',
  '👏': 'aplaudiu',
  '💀': 'não sobreviveu',
}

export function verboReacao(emoji) {
  return VERBO_REACAO[emoji] || ''
}
