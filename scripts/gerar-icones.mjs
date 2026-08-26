// Gera os PNGs do app a partir de `public/icone.svg`.
//
// Trocou o desenho? Edite o SVG e rode:
//
//   npm i --no-save sharp && node scripts/gerar-icones.mjs
//
// O sharp NÃO está no package.json de propósito: ele só é preciso aqui, e é
// pesado demais para entrar no `npm install` de quem só quer rodar o site.
//
// Por que PNG, se o SVG escala melhor: nem o ícone da tela de início do iPhone
// nem os ícones do manifest do Android aceitam SVG de forma confiável.

import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const ORIGEM = 'public/icone.svg'
const svg = readFileSync(ORIGEM, 'utf8')

// A versão "maskable" (e a do iPhone) não pode ter cantos transparentes: o
// sistema recorta o ícone no formato dele — círculo, quadrado arredondado,
// gota — e o que sobra do lado de fora some. Então o fundo sangra até a borda
// e o pato encolhe para caber na zona segura (80% do quadro).
const cheio = svg
  .replace(
    /<circle cx="256" cy="256" r="256"[^/]*\/>\s*<circle cx="256" cy="256" r="232"[^/]*\/>/,
    '<rect width="512" height="512" fill="#8ab7cb" />'
  )
  .replace(
    '<g transform="translate(256 250) scale(0.86) translate(-256 -256)">',
    '<g transform="translate(256 252) scale(0.8) translate(-256 -256)">'
  )

const arquivos = [
  // Ícones do manifest (Android/Chrome).
  { nome: 'public/icone-192.png', fonte: svg, tamanho: 192 },
  { nome: 'public/icone-512.png', fonte: svg, tamanho: 512 },
  // Recortável pelo sistema.
  { nome: 'public/icone-maskable-512.png', fonte: cheio, tamanho: 512 },
  // Tela de início do iPhone: 180px e sem transparência.
  { nome: 'public/apple-touch-icon.png', fonte: cheio, tamanho: 180 },
]

for (const { nome, fonte, tamanho } of arquivos) {
  const png = await sharp(Buffer.from(fonte))
    .resize(tamanho, tamanho)
    .flatten({ background: '#8ab7cb' })
    .png({ compressionLevel: 9 })
    .toBuffer()
  writeFileSync(nome, png)
  console.log(`${nome} — ${tamanho}px, ${(png.length / 1024).toFixed(1)} kB`)
}
