// Os sons da apuração, sintetizados na hora com a Web Audio API — nenhum
// arquivo para baixar, nada que dependa de rede na hora H. Tudo passa por
// `tocar`, que respeita o interruptor de som (guardado no navegador) e só cria
// o contexto de áudio depois de um gesto do usuário, como o navegador exige.

const CHAVE_MUDO = 'clubedolivro:apuracao:mudo'

let contexto = null

function obterContexto() {
  if (contexto) return contexto
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  contexto = new Ctx()
  return contexto
}

export function somLigado() {
  try {
    return localStorage.getItem(CHAVE_MUDO) !== '1'
  } catch {
    return true
  }
}

export function ligarSom(ligado) {
  try {
    if (ligado) localStorage.removeItem(CHAVE_MUDO)
    else localStorage.setItem(CHAVE_MUDO, '1')
  } catch {
    // sem localStorage, a escolha só vale até recarregar
  }
}

function tocar(fn) {
  if (!somLigado()) return
  const ctx = obterContexto()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  try {
    fn(ctx, ctx.currentTime)
  } catch {
    // áudio é enfeite: se falhar, a apuração segue muda
  }
}

// Um "tec" curto: uma cédula saiu da urna.
export function somCedula() {
  tocar((ctx, t) => {
    const osc = ctx.createOscillator()
    const ganho = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(880, t)
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.08)
    ganho.gain.setValueAtTime(0.0001, t)
    ganho.gain.exponentialRampToValueAtTime(0.25, t + 0.005)
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
    osc.connect(ganho).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.13)
  })
}

// Um pulo na contagem: o livro subiu de posição.
export function somSubida() {
  tocar((ctx, t) => {
    ;[523.25, 659.25].forEach((f, k) => {
      const osc = ctx.createOscillator()
      const ganho = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f
      const ini = t + k * 0.07
      ganho.gain.setValueAtTime(0.0001, ini)
      ganho.gain.exponentialRampToValueAtTime(0.18, ini + 0.01)
      ganho.gain.exponentialRampToValueAtTime(0.0001, ini + 0.18)
      osc.connect(ganho).connect(ctx.destination)
      osc.start(ini)
      osc.stop(ini + 0.2)
    })
  })
}

// Rufar de tambores por `duracao` segundos: batidas de ruído filtrado que
// aceleram e crescem até o fim.
export function somTambores(duracao = 1.6) {
  tocar((ctx, t) => {
    const tamanho = Math.floor(ctx.sampleRate * 0.06)
    const buffer = ctx.createBuffer(1, tamanho, ctx.sampleRate)
    const dados = buffer.getChannelData(0)
    for (let k = 0; k < tamanho; k++) {
      dados[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / tamanho, 2)
    }
    const filtro = ctx.createBiquadFilter()
    filtro.type = 'lowpass'
    filtro.frequency.value = 320
    const mestre = ctx.createGain()
    mestre.gain.setValueAtTime(0.35, t)
    mestre.gain.linearRampToValueAtTime(0.9, t + duracao)
    filtro.connect(mestre).connect(ctx.destination)

    let quando = 0
    while (quando < duracao) {
      const fonte = ctx.createBufferSource()
      fonte.buffer = buffer
      fonte.playbackRate.value = 0.8 + Math.random() * 0.4
      fonte.connect(filtro)
      fonte.start(t + quando)
      // Do rufar lento ao frenético.
      const progresso = quando / duracao
      quando += 0.11 - 0.075 * progresso
    }
    // A batida final, seca.
    const fim = ctx.createOscillator()
    const g = ctx.createGain()
    fim.type = 'sine'
    fim.frequency.setValueAtTime(140, t + duracao)
    fim.frequency.exponentialRampToValueAtTime(50, t + duracao + 0.25)
    g.gain.setValueAtTime(0.0001, t + duracao)
    g.gain.exponentialRampToValueAtTime(0.7, t + duracao + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao + 0.35)
    fim.connect(g).connect(ctx.destination)
    fim.start(t + duracao)
    fim.stop(t + duracao + 0.4)
  })
}

// Fanfarra: os eleitos sobem ao pódio.
export function somFanfarra() {
  tocar((ctx, t) => {
    const notas = [
      [523.25, 0, 0.16],
      [523.25, 0.18, 0.16],
      [523.25, 0.36, 0.16],
      [659.25, 0.54, 0.4],
      [523.25, 0.98, 0.16],
      [659.25, 1.16, 0.16],
      [783.99, 1.34, 0.9],
    ]
    notas.forEach(([f, ini, dur]) => {
      ;[1, 2].forEach((harm) => {
        const osc = ctx.createOscillator()
        const ganho = ctx.createGain()
        osc.type = harm === 1 ? 'square' : 'triangle'
        osc.frequency.value = f * harm
        const inicio = t + ini
        ganho.gain.setValueAtTime(0.0001, inicio)
        ganho.gain.exponentialRampToValueAtTime(harm === 1 ? 0.08 : 0.12, inicio + 0.02)
        ganho.gain.setValueAtTime(harm === 1 ? 0.08 : 0.12, inicio + dur - 0.05)
        ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + dur)
        osc.connect(ganho).connect(ctx.destination)
        osc.start(inicio)
        osc.stop(inicio + dur + 0.02)
      })
    })
  })
}
