import { useEffect, useMemo, useRef, useState } from 'react'
import './styles/app.css'
import './styles/menu.css'
import { obterOuCriarUserId, limparIdentidade } from './lib/identity'
import { buscarUsuario, garantirCoresDosMembros, reabrirLivro } from './lib/db'
import {
  useMembros,
  useLivrosDoClube,
  useProgresso,
  useMural,
  useNotasDeLivros,
  useResenhas,
  useComentarios,
  useHistorico,
  useEleicoes,
  useIndicacoes,
} from './hooks/useDadosClube'
import { inicial, pctDoProgresso, emMilissegundos } from './lib/formato'
import { corDoMembro } from './lib/cores'
import {
  mesmaSerie,
  ordenarSerie,
  seriesConhecidas as listarSeries,
  serieEmLeitura,
} from './lib/series'
import { montarAtividades, contarNaoVistas } from './lib/atividades'
import { separarEleicoes } from './lib/eleicao'
import { useFoco } from './hooks/useFoco'
import { useRota } from './hooks/useRota'
import { definirAutor } from './lib/push'

import Cadastro from './components/Cadastro'
import Menu, { SinoNovidades } from './components/Menu'
import LivroAtualCard from './components/LivroAtualCard'
import PaginaLivro from './components/PaginaLivro'
import LivrosAnteriores from './components/LivrosAnteriores'
import LivrosLidos from './components/LivrosLidos'
import Patos from './components/Patos'
import Mural from './components/Mural'
import Atividades from './components/Atividades'
import ProximoLivro from './components/ProximoLivro'
import SeletorLivros from './components/SeletorLivros'
import Eleicao from './components/Eleicao'
import AbrirEleicaoModal from './components/AbrirEleicaoModal'
import CadastrarLivroModal from './components/CadastrarLivroModal'
import EditarLivroModal from './components/EditarLivroModal'
import EditarPerfilModal from './components/EditarPerfilModal'
import AtualizarProgressoModal from './components/AtualizarProgressoModal'
import ChangelogModal, { CHANGELOG_VERSAO } from './components/ChangelogModal'
import { FotoProvider, useVerFoto } from './components/FotoContext'
import {
  IconeVela,
  IconeMarcador,
  IconeLivroAberto,
  IconeLivro,
  IconePena,
  IconePilha,
  IconePato,
  IconeMais,
  IconeUrna,
  DivisoriaOrnamentada,
} from './components/Icones'

// Preferência de visualização do progresso no celular (barras ou corrida).
const CHAVE_VISTA = 'clubedolivro:vista-mobile'
// Até quando o membro já viu as novidades (milissegundos).
const CHAVE_NOVIDADES = 'clubedolivro:novidades-vistas'
// Qual dos livros abertos este navegador está lendo (quando o clube está numa
// série e há mais de um).
const CHAVE_LIVRO = 'clubedolivro:livro-escolhido'
// Mapa vazio reaproveitado: um objeto novo a cada render reiniciaria os
// `useMemo` que dependem dele à toa.
const VAZIO = {}
const NADA = []

// Os itens do menu principal, na ordem em que aparecem.
const ITENS_DO_MENU = [
  { chave: 'atual', rotulo: 'Livro atual', Icone: IconeLivroAberto },
  { chave: 'anteriores', rotulo: 'Anteriores', Icone: IconePilha },
  { chave: 'lidos', rotulo: 'Livros lidos', Icone: IconeLivro },
  { chave: 'patos', rotulo: 'Patos', Icone: IconePato },
  { chave: 'mural', rotulo: 'Mural', Icone: IconePena },
  { chave: 'proximo', rotulo: 'Próximo livro', Icone: IconeMarcador },
  { chave: 'eleicao', rotulo: 'Eleição', Icone: IconeUrna },
]

export default function App() {
  const [userId] = useState(() => obterOuCriarUserId())
  const [usuario, setUsuario] = useState(null)
  const [carregandoUsuario, setCarregandoUsuario] = useState(true)

  // Carrega o documento do usuário atual (se existir).
  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const u = await buscarUsuario(userId)
        if (ativo) setUsuario(u)
      } catch (err) {
        console.error('Erro ao carregar usuário:', err)
      } finally {
        if (ativo) setCarregandoUsuario(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [userId])

  function aoCadastrar() {
    // Recarrega o usuário recém-criado.
    buscarUsuario(userId).then(setUsuario).catch(console.error)
  }

  function trocarUsuario() {
    const ok = window.confirm(
      'Isto vai desconectar você deste navegador e voltar ao cadastro. Continuar?'
    )
    if (!ok) return
    limparIdentidade()
    window.location.reload()
  }

  if (carregandoUsuario) {
    return (
      <div className="carregando-tela">
        <IconeVela size={40} className="vela-piscando" />
        <p style={{ fontFamily: 'var(--fonte-display)', fontStyle: 'italic' }}>
          Acendendo as velas da biblioteca…
        </p>
      </div>
    )
  }

  if (!usuario) {
    return <Cadastro userId={userId} aoConcluir={aoCadastrar} />
  }

  return (
    <FotoProvider>
      <ClubeLogado userId={userId} usuario={usuario} onTrocar={trocarUsuario} />
    </FotoProvider>
  )
}

// Vista principal, já com identidade definida.
function ClubeLogado({ userId, usuario, onTrocar }) {
  const [modalLivro, setModalLivro] = useState(false)
  // O mesmo formulário de livro, aberto já com a série preenchida — quem clica
  // ali quer somar um volume, não trocar a leitura do clube.
  const [modalLivroNaSerie, setModalLivroNaSerie] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalPerfil, setModalPerfil] = useState(false)
  const [modalProgresso, setModalProgresso] = useState(false)
  // Os mesmos formulários, apontados para o livro que está na fila.
  const [modalProximo, setModalProximo] = useState(false)
  const [modalEditarProximo, setModalEditarProximo] = useState(false)
  const [modalProgressoProximo, setModalProgressoProximo] = useState(false)
  // Abrir a eleição do próximo livro (pede a senha da urna).
  const [modalEleicao, setModalEleicao] = useState(false)
  const verFoto = useVerFoto()

  // A tela em que o membro está: vem do `#hash`, então o voltar do celular e
  // um link direto funcionam. `pagina` é o item do menu; `id` é o livro ou o
  // pato aberto; `sub` é a sub-aba de um livro (corrida, notas, resenhas).
  const { rota, navegar } = useRota()
  const { pagina, sub } = rota

  // Como o progresso aparece no celular: barras (a estante) ou a pista de
  // corrida. A escolha fica guardada neste navegador.
  const [vista, setVista] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_VISTA) === 'corrida' ? 'corrida' : 'barras'
    } catch {
      return 'barras'
    }
  })
  function trocarVista(nova) {
    setVista(nova)
    try {
      localStorage.setItem(CHAVE_VISTA, nova)
    } catch {
      // navegador sem localStorage: a escolha só não sobrevive ao recarregar
    }
  }

  // Até quando este navegador já viu as novidades. Na primeira visita o marco
  // é agora: quem chega hoje não recebe um contador com meses de história.
  const [vistoAte, setVistoAte] = useState(() => {
    const agora = Date.now()
    try {
      const salvo = Number(localStorage.getItem(CHAVE_NOVIDADES))
      if (Number.isFinite(salvo) && salvo > 0) return salvo
      localStorage.setItem(CHAVE_NOVIDADES, String(agora))
    } catch {
      // segue com o marco de agora, só sem persistir
    }
    return agora
  })
  // O que estava por ver quando as novidades foram abertas (para destacar).
  const [destaqueAte, setDestaqueAte] = useState(null)
  // Para onde um aviso de novidades mandou ir. A `marca` muda a cada clique,
  // então clicar duas vezes no mesmo aviso funciona de novo.
  const [foco, setFoco] = useState(null)

  // Changelog: mostra uma vez por navegador, logo após estar logado.
  const [modalChangelog, setModalChangelog] = useState(() => {
    try {
      return localStorage.getItem(CHANGELOG_VERSAO) !== 'visto'
    } catch {
      return false
    }
  })
  function fecharChangelog() {
    try {
      localStorage.setItem(CHANGELOG_VERSAO, 'visto')
    } catch {
      // ignora
    }
    setModalChangelog(false)
  }

  const { membros } = useMembros()
  // Normalmente um livro em leitura; numa série, vários abertos ao mesmo tempo.
  // `livros` é a coleção inteira — abertos, fila e encerrados.
  const { livros, abertos: livrosAtuais, encerrados, proximo, fila } = useLivrosDoClube()
  const { recados } = useMural()
  const { resenhas, porLivro: resenhasPorLivro } = useResenhas()
  const { comentarios, porAlvo: comentariosPorAlvo } = useComentarios()
  const { historico } = useHistorico()
  const { eleicoes } = useEleicoes()
  const { indicacoes } = useIndicacoes()
  const { porLivro: progressoPorLivro, porMembro } = useProgresso()
  const meuProgressoPorLivro = porMembro[userId] || VAZIO

  // A série em leitura só existe se TODOS os livros abertos forem dela.
  const serieDoClube = useMemo(() => serieEmLeitura(livrosAtuais), [livrosAtuais])

  // Os volumes que ficam no trilho: os abertos MAIS os que o clube já
  // encerrou dessa mesma série. Um volume terminado não some da série — ele
  // continua ali, marcado como encerrado, com a sua corrida e as suas notas
  // guardadas. Quem chegou ao fim antes dos outros ainda quer reler a
  // conversa daquele livro.
  const volumesDaSerie = useMemo(() => {
    if (!serieDoClube) return livrosAtuais
    const daSerie = encerrados.filter((l) => mesmaSerie(l, { serie: serieDoClube }))
    return ordenarSerie([...livrosAtuais, ...daSerie])
  }, [livrosAtuais, encerrados, serieDoClube])

  const idsDoTrilho = useMemo(
    () => volumesDaSerie.map((l) => l.id),
    [volumesDaSerie]
  )

  // Os livros anteriores: só o que está no HISTÓRICO — é ele que diz que o
  // clube leu e encerrou o livro. Um livro inativo que não está lá nunca foi
  // do clube: saiu da fila antes da vez dele (`foraDaFila`, abaixo).
  // Do encerrado mais recentemente ao mais antigo.
  const anteriores = useMemo(() => {
    const quando = {}
    historico.forEach((h) => {
      quando[h.id] = emMilissegundos(h.encerradoEm) || 0
    })
    return encerrados
      .filter((l) => l.id in quando)
      .sort(
        (a, b) =>
          (quando[b.id] || 0) - (quando[a.id] || 0) ||
          (emMilissegundos(b.iniciadoEm) || 0) - (emMilissegundos(a.iniciadoEm) || 0)
      )
  }, [encerrados, historico])

  const foraDaFila = useMemo(() => {
    const noHistorico = new Set(historico.map((h) => h.id))
    return encerrados.filter((l) => !noHistorico.has(l.id))
  }, [encerrados, historico])

  // O livro anterior aberto: o da rota ou, sem rota válida, o mais recente.
  const livroAnterior = useMemo(() => {
    if (!anteriores.length) return null
    return anteriores.find((l) => l.id === rota.id) || anteriores[0]
  }, [anteriores, rota.id])

  // Quem abre "Anteriores" sem dizer qual cai no mais recente — e a rota
  // passa a dizer qual é, para o voltar e o recarregar baterem com a tela.
  useEffect(() => {
    if (pagina !== 'anteriores' || !livroAnterior) return
    if (rota.id !== livroAnterior.id) {
      navegar({ pagina, id: livroAnterior.id, sub }, { substituir: true })
    }
  }, [pagina, rota.id, sub, livroAnterior, navegar])

  // Notas dos livros que a tela pode abrir: os volumes do trilho e o livro
  // anterior em foco. Um aviso de novidades tem de ter para onde levar.
  const idsComNotas = useMemo(() => {
    const ids = [...idsDoTrilho]
    if (livroAnterior && !ids.includes(livroAnterior.id)) ids.push(livroAnterior.id)
    return ids
  }, [idsDoTrilho, livroAnterior])
  const { notas: notasCarregadas, porLivro: notasPorLivro } = useNotasDeLivros(idsComNotas)
  // Para as novidades só contam as notas dos livros em leitura.
  const notasDosAbertos = useMemo(
    () => notasCarregadas.filter((n) => idsDoTrilho.includes(n.livroId)),
    [notasCarregadas, idsDoTrilho]
  )

  // Qual dos livros abertos ESTE membro está lendo. A escolha fica no
  // navegador; sem escolha, o site adivinha pelo lugar onde ele mexeu por
  // último — quem está no terceiro volume não quer cair no primeiro toda vez
  // que abre o site.
  const [livroEscolhidoId, setLivroEscolhidoId] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_LIVRO) || ''
    } catch {
      return ''
    }
  })
  function escolherLivro(id) {
    setLivroEscolhidoId(id)
    try {
      localStorage.setItem(CHAVE_LIVRO, id)
    } catch {
      // navegador sem localStorage: a escolha só não sobrevive ao recarregar
    }
  }

  const livro = useMemo(() => {
    if (!volumesDaSerie.length) return null
    const escolhido = volumesDaSerie.find((l) => l.id === livroEscolhidoId)
    if (escolhido) return escolhido
    // Sem escolha válida (primeira visita, ou o volume escolhido saiu do ar):
    // vale aquele EM LEITURA em que este membro marcou progresso por último —
    // o palpite automático nunca cai num volume já encerrado.
    const candidatos = livrosAtuais.length ? livrosAtuais : volumesDaSerie
    const meu = [...candidatos].sort(
      (a, b) =>
        (emMilissegundos(meuProgressoPorLivro[b.id]?.atualizadoEm) || 0) -
        (emMilissegundos(meuProgressoPorLivro[a.id]?.atualizadoEm) || 0)
    )[0]
    return meu || candidatos[0]
  }, [volumesDaSerie, livrosAtuais, livroEscolhidoId, meuProgressoPorLivro])

  const porUsuario = progressoPorLivro[livro?.id] || VAZIO
  const porUsuarioProximo = progressoPorLivro[proximo?.id] || VAZIO
  const porUsuarioAnterior = progressoPorLivro[livroAnterior?.id] || VAZIO
  const notas = livro ? notasPorLivro[livro.id] || NADA : NADA
  const notasDoAnterior = livroAnterior ? notasPorLivro[livroAnterior.id] || NADA : NADA

  // As novidades cobrem o que a tela abre: os volumes do trilho. O livro da
  // fila fica de fora — um aviso sobre ele não teria para onde levar.
  const progressoDosAbertos = useMemo(
    () =>
      Object.entries(progressoPorLivro)
        .filter(([livroId]) => idsDoTrilho.includes(livroId))
        .flatMap(([, porUsuarioDoLivro]) => Object.values(porUsuarioDoLivro)),
    [progressoPorLivro, idsDoTrilho]
  )

  // Reabrir só faz sentido para um volume da MESMA série do que está em
  // leitura (ou quando não há nada em leitura): é a regra que mantém a estante
  // do clube coerente.
  function podeReabrir(alvo) {
    return (
      !!alvo &&
      alvo.ativo !== true &&
      (!livrosAtuais.length || mesmaSerie(alvo, { serie: serieDoClube }))
    )
  }

  async function reabrirVolume(alvo) {
    const ok = window.confirm(
      `Reabrir “${alvo.titulo}”?\n\n` +
        'Ele volta para a leitura do clube, ao lado dos outros volumes da série, ' +
        'e sai do histórico. Progresso, notas e resenhas continuam exatamente ' +
        'como estão — nada foi apagado quando ele foi encerrado.'
    )
    if (!ok) return
    try {
      await reabrirLivro(alvo.id)
    } catch (err) {
      console.error(err)
      window.alert('Não foi possível reabrir este volume. Tente de novo.')
    }
  }

  // As séries que o clube já conhece, para sugerir nos formulários.
  const seriesConhecidas = useMemo(
    () => listarSeries(livrosAtuais, fila, historico),
    [livrosAtuais, fila, historico]
  )
  // Promover o livro da fila encerra o que está aberto — a não ser que ele seja
  // outro volume da mesma série, e aí só se junta aos demais.
  const proximoEntraNaSerie = !!(
    proximo &&
    livrosAtuais.length &&
    livrosAtuais.every((l) => mesmaSerie(l, proximo))
  )

  const membrosPorId = useMemo(() => {
    const mapa = {}
    membros.forEach((m) => {
      mapa[m.id] = m
    })
    return mapa
  }, [membros])

  // Membros que entraram antes das cores existirem ganham uma sorteada. Roda
  // uma vez por sessão; o sorteio é determinístico, então não há briga se dois
  // navegadores fizerem isso ao mesmo tempo.
  const coresSorteadas = useRef(false)
  useEffect(() => {
    if (coresSorteadas.current || !membros.length) return
    coresSorteadas.current = true
    garantirCoresDosMembros(membros).catch((err) =>
      console.error('Erro ao sortear cores dos membros:', err)
    )
  }, [membros])

  // Títulos de todos os livros (abertos + fila + histórico) para nomear o livro
  // nos avisos de novidades — com vários volumes abertos, "fulano chegou a 40%"
  // sem dizer de quê não conta nada.
  const tituloPorLivroId = useMemo(() => {
    const mapa = {}
    historico.forEach((h) => {
      mapa[h.id] = h.titulo
    })
    livrosAtuais.forEach((l) => {
      mapa[l.id] = l.titulo
    })
    fila.forEach((l) => {
      mapa[l.id] = l.titulo
    })
    return mapa
  }, [historico, livrosAtuais, fila])

  const livrosResenhaveis = useMemo(() => {
    const conjunto = new Set()
    Object.entries(meuProgressoPorLivro).forEach(([livroId, prog]) => {
      if (pctDoProgresso(prog, 0) >= 100) conjunto.add(livroId)
    })
    return conjunto
  }, [meuProgressoPorLivro])

  // As novidades cobrem TODOS os livros abertos, não só o que este membro
  // escolheu: quem está no segundo volume quer saber que o resto do clube
  // avançou no terceiro.
  const atividades = useMemo(
    () =>
      montarAtividades({
        notas: notasDosAbertos,
        resenhas,
        comentarios,
        progresso: progressoDosAbertos,
        eleicoes,
        indicacoes,
        membrosPorId,
        tituloPorLivroId,
        livrosResenhaveis,
        nomearLivro: livrosAtuais.length > 1,
      }),
    [
      notasDosAbertos,
      resenhas,
      comentarios,
      progressoDosAbertos,
      eleicoes,
      indicacoes,
      membrosPorId,
      tituloPorLivroId,
      livrosResenhaveis,
      livrosAtuais,
    ]
  )

  const naoVistas = contarNaoVistas(atividades, vistoAte)

  const { passadas: eleicoesPassadas } = useMemo(
    () => separarEleicoes(eleicoes),
    [eleicoes]
  )

  // Ao entrar nas novidades — pelo sino, por um aviso ou pelo voltar —,
  // guarda o que ERA novo para continuar destacado durante a visita, e só
  // então zera o contador.
  useEffect(() => {
    if (pagina !== 'novidades') return
    setDestaqueAte(vistoAte)
    const agora = Date.now()
    setVistoAte(agora)
    try {
      localStorage.setItem(CHAVE_NOVIDADES, String(agora))
    } catch {
      // navegador sem localStorage: o contador só não sobrevive ao recarregar
    }
  }, [pagina]) // eslint-disable-line react-hooks/exhaustive-deps

  // Um aviso de novidades diz "a nota X do livro Y"; a rota é quem sabe se o
  // livro Y está em leitura (página do livro atual) ou já foi encerrado
  // (anteriores / lidos). A tradução mora aqui, perto das duas listas.
  function rotaDoDestino(destino) {
    const { aba, tipo, livroId } = destino
    if (aba === 'eleicao') return { pagina: 'eleicao' }
    if (aba === 'novidades') return { pagina: 'novidades' }

    const noTrilho = !!livroId && idsDoTrilho.includes(livroId)
    const encerrado = !!livroId && anteriores.some((l) => l.id === livroId)

    if (aba === 'resenhas') {
      const alvo = livroId || (tipo === 'livro' ? destino.id : '')
      if (alvo && idsDoTrilho.includes(alvo)) return { pagina: 'atual', sub: 'resenhas' }
      if (alvo) return { pagina: 'lidos', id: alvo }
      return { pagina: 'lidos' }
    }

    // aba 'leitura': nota ou corrida de um livro.
    const subDoTipo = tipo === 'nota' ? 'notas' : 'corrida'
    if (noTrilho || !livroId) return { pagina: 'atual', sub: subDoTipo }
    if (encerrado) return { pagina: 'anteriores', id: livroId, sub: subDoTipo }
    return { pagina: 'atual', sub: subDoTipo }
  }

  function irPara(destino) {
    if (!destino) return
    // Um aviso pode ser de outro volume da série. Levar a tela até ele sem
    // trocar o livro escolhido mostraria a corrida errada — ou nota nenhuma.
    // Só troca para volume que está no trilho: guardar um id fora dele faria
    // o site cair no palpite automático na próxima visita.
    if (destino.livroId && idsDoTrilho.includes(destino.livroId)) {
      escolherLivro(destino.livroId)
    }
    navegar(rotaDoDestino(destino))
    setFoco({ ...destino, marca: Date.now() })
  }

  // O toque numa notificação do celular chega de dois jeitos: com o app
  // fechado, o service worker abre o site com `?aviso=`; com o app aberto, ele
  // manda o id por mensagem. Nos dois casos guardamos o id do evento e
  // esperamos as novidades ficarem prontas para saber para onde ir.
  const [avisoTocado, setAvisoTocado] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('aviso')
    // Tira o `?aviso=` da barra de endereço: recarregar a página não deve
    // fazer a tela pular de novo para a mesma nota.
    if (id) {
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    }
    return id || null
  })

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const aoReceber = (evento) => {
      if (evento.data?.tipo === 'aviso') setAvisoTocado(evento.data.eventoId || null)
    }
    navigator.serviceWorker.addEventListener('message', aoReceber)
    return () => navigator.serviceWorker.removeEventListener('message', aoReceber)
  }, [])

  // O id do aviso é o mesmo id do evento no feed de novidades — por isso o
  // destino do toque sai de graça: é o mesmo que o clique no feed usaria.
  useEffect(() => {
    if (!avisoTocado || !atividades.length) return
    const evento = atividades.find((a) => a.id === avisoTocado)
    setAvisoTocado(null)
    if (evento?.destino) irPara(evento.destino)
    // Recado do mural não é um evento do feed; ele tem página própria.
    else if (avisoTocado.startsWith('mural-')) navegar({ pagina: 'mural' })
    else navegar({ pagina: 'novidades' })
  }, [avisoTocado, atividades]) // eslint-disable-line react-hooks/exhaustive-deps

  useFoco(foco, 'corrida')

  const minhaPorcentagem = livro
    ? pctDoProgresso(porUsuario[userId], livro.totalPaginas)
    : 0
  const minhaPctProximo = proximo
    ? pctDoProgresso(porUsuarioProximo[userId], 0)
    : 0
  const minhaPctAnterior = livroAnterior
    ? pctDoProgresso(porUsuarioAnterior[userId], livroAnterior.totalPaginas)
    : 0

  // Quantos já cruzaram os 100% do livro de agora — é esse número que diz ao
  // clube se está na hora de virar a página.
  const quantosTerminaram = useMemo(
    () =>
      membros.filter(
        (m) => pctDoProgresso(porUsuario[m.id], livro?.totalPaginas) >= 100
      ).length,
    [membros, porUsuario, livro]
  )

  // Usa o doc ao vivo (onSnapshot) como fonte do perfil, com fallback para o
  // que foi carregado no início — assim edições de nome/foto aparecem na hora.
  const meuPerfil = membrosPorId[userId] || usuario
  const minhaCor = corDoMembro({ id: userId, ...meuPerfil })

  // Os avisos no celular são montados em vários cantos do app ("Fulano
  // comentou…"). Em vez de passar o nome por props até lá, ele fica depositado
  // em `push.js` — e acompanha a troca de nome no perfil.
  useEffect(() => {
    definirAutor(userId, meuPerfil.nome)
  }, [userId, meuPerfil.nome])

  // O livro em que o botão "Meu progresso" mexe: o atual, ou o anterior que
  // está aberto — é assim que um retardatário termina um livro encerrado.
  const livroDoProgresso = pagina === 'anteriores' ? livroAnterior : livro
  const porUsuarioDoProgresso = pagina === 'anteriores' ? porUsuarioAnterior : porUsuario
  const minhaPctDoProgresso = pagina === 'anteriores' ? minhaPctAnterior : minhaPorcentagem
  const mostrarFab =
    !!livroDoProgresso && (pagina === 'atual' || pagina === 'anteriores')

  // Os botões de trocar o livro, no pé da corrida do livro atual.
  const acoesDaCorrida = (
    <div className="centro trocar-livro" style={{ marginTop: '2rem' }}>
      {serieDoClube && (
        <button className="btn btn-fantasma" onClick={() => setModalLivroNaSerie(true)}>
          <IconeMais size={16} />
          Abrir outro livro da série
        </button>
      )}
      <button className="btn btn-fantasma" onClick={() => setModalLivro(true)}>
        Trocar o livro do clube
      </button>
      {/* O caminho democrático: em vez de alguém trocar o livro, o clube
          elege o próximo. */}
      <button className="btn btn-fantasma" onClick={() => navegar({ pagina: 'eleicao' })}>
        <IconeUrna size={16} />
        Eleição do próximo livro
      </button>
    </div>
  )

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="container cabecalho-conteudo">
          <SinoNovidades
            naoVistas={naoVistas}
            ativo={pagina === 'novidades'}
            onClick={() => navegar({ pagina: 'novidades' })}
          />
          <h1 className="titulo-clube">Patoteca</h1>
          <p className="subtitulo-clube">A estante viva onde lemos juntos</p>
          <DivisoriaOrnamentada className="divisoria" />

          <div className="barra-usuario">
            {meuPerfil.avatarUrl ? (
              <img
                className="mini-avatar avatar-clicavel"
                src={meuPerfil.avatarUrl}
                alt={meuPerfil.nome}
                style={{ borderColor: minhaCor }}
                onClick={() => verFoto(meuPerfil.avatarUrl, meuPerfil.nome)}
              />
            ) : (
              <span
                className="mini-avatar"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--madeira-clara)',
                  borderColor: minhaCor,
                  color: 'var(--dourado-claro)',
                }}
              >
                {inicial(meuPerfil.nome)}
              </span>
            )}
            <span>
              Bem-vindo(a), <strong>{meuPerfil.nome}</strong>
            </span>
            <button className="btn-texto" onClick={() => navegar({ pagina: 'patos', id: userId })}>
              Meu perfil
            </button>
            <span className="texto-tenue" aria-hidden="true">·</span>
            <button className="btn-texto" onClick={() => setModalPerfil(true)}>
              Editar perfil
            </button>
            <span className="texto-tenue" aria-hidden="true">·</span>
            <button className="btn-texto" onClick={onTrocar}>
              Não é você? Trocar
            </button>
          </div>
        </div>
      </header>

      <Menu
        itens={ITENS_DO_MENU}
        ativo={pagina}
        aoEscolher={(chave) => navegar({ pagina: chave })}
      />

      <main className="conteudo container">
        {pagina === 'atual' && (
          <>
            <LivroAtualCard
              livro={livro}
              quantosAbertos={livrosAtuais.length}
              aoAbrirCadastro={() => setModalLivro(true)}
              aoEditar={() => setModalEditar(true)}
              aoAdicionarNaSerie={() => setModalLivroNaSerie(true)}
              aoReabrir={podeReabrir(livro) ? () => reabrirVolume(livro) : null}
            />

            <SeletorLivros
              livros={volumesDaSerie}
              selecionadoId={livro?.id}
              meuProgressoPorLivro={meuProgressoPorLivro}
              progressoPorLivro={progressoPorLivro}
              minhaCor={minhaCor}
              serie={serieDoClube}
              aoSelecionar={escolherLivro}
              aoAdicionar={serieDoClube ? () => setModalLivroNaSerie(true) : null}
            />

            <PaginaLivro
              livro={livro}
              sub={sub}
              aoTrocarSub={(nova) => navegar({ pagina, sub: nova })}
              userId={userId}
              membros={membros}
              porUsuario={porUsuario}
              notas={notas}
              quantosAbertos={livrosAtuais.length}
              membrosPorId={membrosPorId}
              comentariosPorAlvo={comentariosPorAlvo}
              resenhas={livro ? resenhasPorLivro[livro.id] || NADA : NADA}
              minhaPct={minhaPorcentagem}
              foco={foco}
              vista={vista}
              aoTrocarVista={trocarVista}
              mostrarRelogio
              situacao={livro?.ativo === true ? 'atual' : 'encerrado'}
              acoesDaCorrida={acoesDaCorrida}
            />
          </>
        )}

        {pagina === 'anteriores' && (
          <>
            <LivrosAnteriores
              livros={anteriores}
              selecionadoId={livroAnterior?.id}
              meuProgressoPorLivro={meuProgressoPorLivro}
              progressoPorLivro={progressoPorLivro}
              minhaCor={minhaCor}
              aoSelecionar={(id) => navegar({ pagina, id, sub })}
            />
            {livroAnterior && (
              <>
                <LivroAtualCard
                  livro={livroAnterior}
                  aoReabrir={podeReabrir(livroAnterior) ? () => reabrirVolume(livroAnterior) : null}
                />
                <PaginaLivro
                  livro={livroAnterior}
                  sub={sub}
                  aoTrocarSub={(nova) => navegar({ pagina, id: livroAnterior.id, sub: nova })}
                  userId={userId}
                  membros={membros}
                  porUsuario={porUsuarioAnterior}
                  notas={notasDoAnterior}
                  membrosPorId={membrosPorId}
                  comentariosPorAlvo={comentariosPorAlvo}
                  resenhas={resenhasPorLivro[livroAnterior.id] || NADA}
                  minhaPct={minhaPctAnterior}
                  foco={foco}
                  vista={vista}
                  aoTrocarVista={trocarVista}
                  situacao="encerrado"
                />
              </>
            )}
          </>
        )}

        {pagina === 'lidos' && (
          <LivrosLidos
            userId={userId}
            livrosAtuais={livrosAtuais}
            historico={historico}
            livros={livros}
            membros={membros}
            membrosPorId={membrosPorId}
            progressoPorLivro={progressoPorLivro}
            meuProgressoPorLivro={meuProgressoPorLivro}
            resenhasPorLivro={resenhasPorLivro}
            comentariosPorAlvo={comentariosPorAlvo}
            foco={foco}
            livroAbertoId={rota.id}
            aoAbrirResenhas={(id) => navegar({ pagina, id })}
            aoFecharResenhas={() => navegar({ pagina })}
            aoVerCorrida={(id, situacao) => {
              if (situacao === 'atual' || idsDoTrilho.includes(id)) {
                if (idsDoTrilho.includes(id)) escolherLivro(id)
                navegar({ pagina: 'atual', sub: 'corrida' })
              } else {
                navegar({ pagina: 'anteriores', id, sub: 'corrida' })
              }
            }}
            aoVerEleicoes={eleicoesPassadas.length ? () => navegar({ pagina: 'eleicao' }) : null}
          />
        )}

        {pagina === 'patos' && (
          <Patos
            userId={userId}
            membros={membros}
            membrosPorId={membrosPorId}
            livros={livros}
            progressoPorLivro={progressoPorLivro}
            resenhasPorLivro={resenhasPorLivro}
            patoId={rota.id}
            aoAbrir={(id) => navegar({ pagina, id })}
            aoFechar={() => navegar({ pagina })}
            aoEditarPerfil={() => setModalPerfil(true)}
            aoVerResenhas={(id) =>
              irPara({ aba: 'resenhas', tipo: 'livro', id, livroId: id })
            }
            aoVerLivro={(id) =>
              irPara({ aba: 'leitura', tipo: 'corrida', id: 'corrida', livroId: id })
            }
          />
        )}

        {pagina === 'mural' && (
          <Mural recados={recados} membrosPorId={membrosPorId} userId={userId} />
        )}

        {pagina === 'proximo' && (
          <>
            {livro?.ativo === true ? (
              <ProximoLivro
                userId={userId}
                membros={membros}
                livroAtual={livro}
                proximo={proximo}
                fila={fila}
                foraDaFila={foraDaFila}
                entraNaSerie={proximoEntraNaSerie}
                porUsuario={porUsuarioProximo}
                minhaPct={minhaPorcentagem}
                quantosTerminaram={quantosTerminaram}
                aoEscolher={() => setModalProximo(true)}
                aoEditar={() => setModalEditarProximo(true)}
                aoAtualizarProgresso={() => setModalProgressoProximo(true)}
              />
            ) : (
              <section className="painel centro estante-pessoal-vazia">
                <div className="selo-secao" style={{ justifyContent: 'center' }}>
                  <IconeMarcador size={40} />
                </div>
                <p className="texto-suave">
                  Sem livro em leitura não existe "próximo": cadastre o livro do
                  clube na página do livro atual.
                </p>
              </section>
            )}
            <div className="centro trocar-livro">
              <button className="btn btn-fantasma" onClick={() => navegar({ pagina: 'eleicao' })}>
                <IconeUrna size={16} />
                Ver a eleição do próximo livro
              </button>
            </div>
          </>
        )}

        {pagina === 'eleicao' && (
          <Eleicao
            userId={userId}
            eleicoes={eleicoes}
            indicacoes={indicacoes}
            membros={membros}
            membrosPorId={membrosPorId}
            livrosAtuais={livrosAtuais}
            historico={historico}
            seriesConhecidas={seriesConhecidas}
            foco={foco}
            aoAbrirEleicao={() => setModalEleicao(true)}
            aoLivroEleito={escolherLivro}
          />
        )}

        {pagina === 'novidades' && (
          <Atividades
            atividades={atividades}
            membrosPorId={membrosPorId}
            vistoAte={destaqueAte}
            aoIrPara={irPara}
          />
        )}
      </main>

      <footer className="rodape container">
        <DivisoriaOrnamentada
          style={{ width: 'min(240px,60%)', height: 14, margin: '0 auto 0.8rem', color: 'var(--dourado)', opacity: 0.6 }}
        />
        <p>“Um livro lido em companhia rende conversa por muitas noites.”</p>
        <div className="aviso" style={{ maxWidth: 560, margin: '0.8rem auto 0' }}>
          Este clube não usa senha. Qualquer pessoa com o link pode ver e alterar
          os dados — mantenha o endereço entre amigos.
        </div>
      </footer>

      {/* Botão flutuante para atualizar progresso (acessível no celular). */}
      {mostrarFab && (
        <button className="fab-progresso" onClick={() => setModalProgresso(true)}>
          <IconeMarcador size={18} />
          Meu progresso
        </button>
      )}

      {modalLivro && (
        <CadastrarLivroModal
          livrosAtuais={livrosAtuais}
          proximoNaFila={proximo}
          seriesConhecidas={seriesConhecidas}
          onFechar={() => setModalLivro(false)}
          aoCadastrar={(id) => {
            escolherLivro(id)
            navegar({ pagina: 'atual', sub: 'corrida' })
          }}
        />
      )}

      {/* O mesmo formulário, já com a série preenchida: é o caminho de quem
          quer só abrir mais um volume ao lado dos que o clube lê. */}
      {modalLivroNaSerie && (
        <CadastrarLivroModal
          livrosAtuais={livrosAtuais}
          proximoNaFila={proximo}
          seriesConhecidas={seriesConhecidas}
          serieInicial={serieDoClube || livro?.serie || ''}
          onFechar={() => setModalLivroNaSerie(false)}
          aoCadastrar={escolherLivro}
        />
      )}

      {modalProximo && (
        <CadastrarLivroModal
          modo="fila"
          livrosAtuais={livrosAtuais}
          seriesConhecidas={seriesConhecidas}
          serieInicial={serieDoClube}
          onFechar={() => setModalProximo(false)}
        />
      )}

      {modalEditar && livro && (
        <EditarLivroModal
          livro={livro}
          livrosAtuais={livrosAtuais}
          seriesConhecidas={seriesConhecidas}
          onFechar={() => setModalEditar(false)}
        />
      )}

      {modalEditarProximo && proximo && (
        <EditarLivroModal
          livro={proximo}
          naFila
          seriesConhecidas={seriesConhecidas}
          onFechar={() => setModalEditarProximo(false)}
        />
      )}

      {modalPerfil && (
        <EditarPerfilModal
          userId={userId}
          perfil={meuPerfil}
          membros={membros}
          onFechar={() => setModalPerfil(false)}
        />
      )}

      {modalProgresso && livroDoProgresso && (
        <AtualizarProgressoModal
          userId={userId}
          livro={livroDoProgresso}
          porcentagemInicial={minhaPctDoProgresso}
          progressoAtual={porUsuarioDoProgresso[userId]}
          onFechar={() => setModalProgresso(false)}
        />
      )}

      {modalProgressoProximo && proximo && (
        <AtualizarProgressoModal
          userId={userId}
          livro={proximo}
          porcentagemInicial={minhaPctProximo}
          progressoAtual={porUsuarioProximo[userId]}
          onFechar={() => setModalProgressoProximo(false)}
        />
      )}

      {modalEleicao && (
        <AbrirEleicaoModal
          userId={userId}
          onFechar={() => setModalEleicao(false)}
          aoAbrir={() => navegar({ pagina: 'eleicao' })}
        />
      )}

      {modalChangelog && <ChangelogModal onFechar={fecharChangelog} />}
    </div>
  )
}
