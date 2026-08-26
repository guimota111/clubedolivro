// Service worker da Patoteca.
//
// Ele existe por UM motivo: receber os avisos e mostrá-los na tela do celular.
// O navegador o mantém registrado mesmo com o app fechado, e o sistema o acorda
// por um instante quando chega um push.
//
// De propósito, ele NÃO guarda o site em cache. Um service worker que serve
// arquivos antigos é a forma mais fácil de deixar metade do clube preso numa
// versão velha sem ninguém entender por quê. Aqui todo pedido segue direto para
// a rede, como se ele não existisse.

// O navegador (Chrome) só considera o site instalável se houver um `fetch`
// registrado. Este não intercepta nada — não chama `respondWith`, então o
// pedido segue o caminho normal.
self.addEventListener('fetch', () => {})

// Assume o controle assim que instala, sem esperar as abas antigas fecharem.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()))

// ---------- O aviso chegando ----------

// O conteúdo vem criptografado ponta a ponta: nem a Apple nem o Google
// conseguiram ler o que está aqui dentro. Se vier vazio ou quebrado, ainda
// assim mostramos algo — no iPhone, um push que não vira notificação visível
// é motivo para o sistema cancelar a inscrição do aparelho.
function lerAviso(evento) {
  try {
    const dados = evento.data?.json()
    if (dados?.texto) return dados
  } catch {
    // conteúdo em formato inesperado; cai no aviso genérico
  }
  return { texto: 'Novidades na Patoteca.', eventoId: '' }
}

self.addEventListener('push', (evento) => {
  const aviso = lerAviso(evento)
  evento.waitUntil(
    self.registration.showNotification('Patoteca', {
      body: aviso.texto,
      icon: '/icone-192.png',
      // Avisos do mesmo evento se substituem em vez de empilhar (o mesmo push
      // chega a todos os aparelhos do membro).
      tag: aviso.eventoId || 'patoteca',
      data: { eventoId: aviso.eventoId || '' },
    })
  )
})

// ---------- O toque no aviso ----------
//
// Leva até o que o aviso conta. O `?aviso=` carrega o id do evento; o site
// sabe traduzir isso em "abra a aba tal, no livro tal, e role até a nota".

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const eventoId = evento.notification.data?.eventoId || ''

  evento.waitUntil(
    (async () => {
      const abas = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      // Com o app já aberto, não vale abrir outra aba: foca a que existe e
      // avisa por mensagem para onde ir.
      const aberta = abas.find((aba) => aba.url.startsWith(self.location.origin))
      if (aberta) {
        await aberta.focus()
        aberta.postMessage({ tipo: 'aviso', eventoId })
        return
      }
      const destino = eventoId
        ? `/?aviso=${encodeURIComponent(eventoId)}`
        : '/'
      await self.clients.openWindow(destino)
    })()
  )
})
