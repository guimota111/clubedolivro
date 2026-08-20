// Séries: um livro pode declarar a que série pertence ("O Cemitério dos Livros
// Esquecidos") e que número ocupa nela.
//
// É isso que permite ao clube ler MAIS DE UM livro ao mesmo tempo: quando a
// leitura se espalha — parte do clube já no terceiro volume, parte ainda no
// segundo —, cada volume vira um livro ativo próprio, com sua corrida, suas
// notas e suas resenhas. A única exigência é que todos sejam da mesma série;
// livro avulso continua sendo um por vez.

import { emMilissegundos } from './formato'

export const LIMITE_SERIE = 140

export function normalizarSerie(nome) {
  return (nome || '').trim().slice(0, LIMITE_SERIE)
}

// Chave de comparação: sem acento, sem caixa e sem espaço sobrando. Assim
// "cemitério dos livros esquecidos" e "Cemiterio dos Livros Esquecidos" são a
// mesma série — ninguém precisa acertar a digitação para os livros se juntarem.
export function chaveSerie(nome) {
  return normalizarSerie(nome)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

// O número do volume dentro da série: inteiro a partir de 1, ou null.
export function ordemValida(valor) {
  if (valor === '' || valor == null) return null
  const n = Math.round(Number(valor))
  if (!Number.isFinite(n) || n < 1 || n > 999) return null
  return n
}

export function serieDoLivro(livro) {
  return normalizarSerie(livro?.serie)
}

export function mesmaSerie(a, b) {
  const ka = chaveSerie(serieDoLivro(a))
  const kb = chaveSerie(serieDoLivro(b))
  return !!ka && ka === kb
}

// Posição para ordenar: quem não informou o número vai para o fim da fila.
function posicao(livro) {
  const n = ordemValida(livro?.serieOrdem)
  return n == null ? Number.POSITIVE_INFINITY : n
}

// Do primeiro volume ao último. Empate (ou livros sem número) desempata pela
// ordem de entrada no site — nunca por acaso.
export function ordenarSerie(livros = []) {
  return [...livros].sort((a, b) => {
    const pa = posicao(a)
    const pb = posicao(b)
    if (pa !== pb) return pa < pb ? -1 : 1
    return (emMilissegundos(a?.iniciadoEm) || 0) - (emMilissegundos(b?.iniciadoEm) || 0)
  })
}

// A série que o clube está lendo agora: só existe se TODOS os livros ativos
// forem dela. Um livro avulso em leitura devolve '' — e aí não dá para
// adicionar outro sem encerrar este.
export function serieEmLeitura(livrosAtivos = []) {
  if (!livrosAtivos.length) return ''
  const primeira = serieDoLivro(livrosAtivos[0])
  if (!chaveSerie(primeira)) return ''
  return livrosAtivos.every((l) => mesmaSerie(l, livrosAtivos[0])) ? primeira : ''
}

// Um livro novo pode entrar ao lado dos que já estão em leitura?
// Sim quando não há nenhum (é o primeiro) ou quando ele é da mesma série deles.
export function podeEntrarJunto(livrosAtivos = [], serie) {
  if (!livrosAtivos.length) return true
  const daCasa = chaveSerie(serieEmLeitura(livrosAtivos))
  const nova = chaveSerie(serie)
  return !!nova && nova === daCasa
}

// "O Cemitério dos Livros Esquecidos · Livro 2" — ou só a série, quando o
// volume não foi numerado.
export function rotuloSerie(livro) {
  const serie = serieDoLivro(livro)
  if (!serie) return ''
  const n = ordemValida(livro?.serieOrdem)
  return n == null ? serie : `${serie} · Livro ${n}`
}

// Só o "Livro 2", para caber em selos apertados.
export function rotuloVolume(livro) {
  const n = ordemValida(livro?.serieOrdem)
  return n == null ? '' : `Livro ${n}`
}

// Nomes de série já usados no clube, para sugerir no formulário em vez de
// exigir que se digite tudo de novo (e se erre um acento pelo caminho).
export function seriesConhecidas(...listas) {
  const vistas = new Map()
  listas.flat().forEach((livro) => {
    const serie = serieDoLivro(livro)
    const chave = chaveSerie(serie)
    if (chave && !vistas.has(chave)) vistas.set(chave, serie)
  })
  return [...vistas.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
