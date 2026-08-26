import { useEffect, useMemo, useRef, useState } from 'react'
import './styles/app.css'
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
import { useFoco } from './hooks/useFoco'
import { definirAutor } from './lib/push'

import Cadastro from './components/Cadastro'
import LivroAtualCard from './components/LivroAtualCard'
import Estante from './components/Estante'
import PistaCorrida from './components/PistaCorrida'
import RelogioCiclo from './components/RelogioCiclo'
import NotasParciais from './components/NotasParciais'
import Resenhas from './components/Resenhas'
import Mural from './components/Mural'
import Historico from './components/Historico'
import Atividades from './components/Atividades'
import ProximoLivro from './components/ProximoLivro'
import SeletorLivros from './components/SeletorLivros'
import MinhaEstante from './components/MinhaEstante'
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
  IconePena,
  IconeSino,
  IconePilha,
  IconeMais,
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
  // 'leitura' | 'novidades' | 'resenhas' | 'estante'
  const [aba, setAba] = useState('leitura')
  const verFoto = useVerFoto()

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
  // O que estava por ver quando a aba foi aberta (para destacar na lista).
  const [destaqueAte, setDestaqueAte] = useState(null)
  // Para onde um aviso de novidades mandou ir. A `marca` muda a cada clique,
  // então clicar duas vezes no mesmo aviso funciona de novo.
  const [foco, setFoco] = useState(null)

  function irPara(destino) {
    if (!destino) return
    // Um aviso pode ser de outro volume da série. Levar a tela até ele sem
    // trocar o livro escolhido mostraria a corrida errada — ou nota nenhuma.
    // Só troca para volume que está no trilho: guardar um id fora dele faria
    // o site cair no palpite automático na próxima visita.
    if (destino.livroId && idsDoTrilho.includes(destino.livroId)) {
      escolherLivro(destino.livroId)
    }
    setAba(destino.aba)
    setFoco({ ...destino, marca: Date.now() })
  }

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
  const { abertos: livrosAtuais, encerrados, proximo } = useLivrosDoClube()
  const { recados } = useMural()
  const { resenhas, porLivro: resenhasPorLivro } = useResenhas()
  const { comentarios, porAlvo: comentariosPorAlvo } = useComentarios()
  const { historico } = useHistorico()
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
  // Notas dos volumes do trilho: são os únicos que a tela abre, e um aviso de
  // novidades tem de ter para onde levar.
  const { notas: notasDosAbertos, porLivro: notasPorLivro } =
    useNotasDeLivros(idsDoTrilho)

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
  const notas = useMemo(
    () => (livro ? notasPorLivro[livro.id] || [] : []),
    [notasPorLivro, livro]
  )

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
  const podeReabrir =
    !!livro &&
    livro.ativo !== true &&
    (!livrosAtuais.length || mesmaSerie(livro, { serie: serieDoClube }))

  async function reabrirVolume() {
    const ok = window.confirm(
      `Reabrir “${livro.titulo}”?\n\n` +
        'Ele volta para a leitura do clube, ao lado dos outros volumes da série, ' +
        'e sai do histórico. Progresso, notas e resenhas continuam exatamente ' +
        'como estão — nada foi apagado quando ele foi encerrado.'
    )
    if (!ok) return
    try {
      await reabrirLivro(livro.id)
    } catch (err) {
      console.error(err)
      window.alert('Não foi possível reabrir este volume. Tente de novo.')
    }
  }

  // As séries que o clube já conhece, para sugerir nos formulários.
  const seriesConhecidas = useMemo(
    () => listarSeries(livrosAtuais, proximo ? [proximo] : [], historico),
    [livrosAtuais, proximo, historico]
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
    if (proximo) mapa[proximo.id] = proximo.titulo
    return mapa
  }, [historico, livrosAtuais, proximo])

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
      membrosPorId,
      tituloPorLivroId,
      livrosResenhaveis,
      livrosAtuais,
    ]
  )

  const naoVistas = contarNaoVistas(atividades, vistoAte)

  // Ao entrar na aba, guarda o que ERA novo para continuar destacado durante a
  // visita — e só então zera o contador.
  function abrirNovidades() {
    setDestaqueAte(vistoAte)
    const agora = Date.now()
    setVistoAte(agora)
    try {
      localStorage.setItem(CHAVE_NOVIDADES, String(agora))
    } catch {
      // navegador sem localStorage: o contador só não sobrevive ao recarregar
    }
    setAba('novidades')
  }

  // O toque numa notificação do celular chega de dois jeitos: com o app
  // fechado, o service worker abre o site com `?aviso=`; com o app aberto, ele
  // manda o id por mensagem. Nos dois casos guardamos o id do evento e
  // esperamos as novidades ficarem prontas para saber para onde ir.
  const [avisoTocado, setAvisoTocado] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('aviso')
    // Tira o `?aviso=` da barra de endereço: recarregar a página não deve
    // fazer a tela pular de novo para a mesma nota.
    if (id) window.history.replaceState({}, '', window.location.pathname)
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
    // Recado do mural não é um evento do feed; ele mora na aba de leitura.
    else if (avisoTocado.startsWith('mural-')) setAba('leitura')
    else setAba('novidades')
  }, [avisoTocado, atividades]) // eslint-disable-line react-hooks/exhaustive-deps

  useFoco(foco, 'corrida')

  const minhaPorcentagem = livro
    ? pctDoProgresso(porUsuario[userId], livro.totalPaginas)
    : 0
  const minhaPctProximo = proximo
    ? pctDoProgresso(porUsuarioProximo[userId], 0)
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

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="container">
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

      <main className="conteudo container">
        <LivroAtualCard
          livro={livro}
          quantosAbertos={livrosAtuais.length}
          aoAbrirCadastro={() => setModalLivro(true)}
          aoEditar={() => setModalEditar(true)}
          aoAdicionarNaSerie={() => setModalLivroNaSerie(true)}
          aoReabrir={podeReabrir ? reabrirVolume : null}
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

        {livro && <RelogioCiclo livro={livro} />}

        {/* Abas: leitura (pista/estante + notas), novidades, resenhas e a
            estante pessoal de quem já leu. */}
        <nav className="abas" role="tablist" aria-label="Seções do clube">
          <button
            role="tab"
            aria-selected={aba === 'leitura'}
            className={`aba${aba === 'leitura' ? ' ativa' : ''}`}
            onClick={() => setAba('leitura')}
          >
            <IconeLivroAberto size={18} /> Leitura
          </button>
          <button
            role="tab"
            aria-selected={aba === 'novidades'}
            className={`aba${aba === 'novidades' ? ' ativa' : ''}`}
            onClick={abrirNovidades}
          >
            <IconeSino size={18} /> Novidades
            {naoVistas > 0 && (
              <span className="aba-selo" aria-label={`${naoVistas} novidades`}>
                {naoVistas > 9 ? '9+' : naoVistas}
              </span>
            )}
          </button>
          <button
            role="tab"
            aria-selected={aba === 'resenhas'}
            className={`aba${aba === 'resenhas' ? ' ativa' : ''}`}
            onClick={() => setAba('resenhas')}
          >
            <IconePena size={18} /> Resenhas
          </button>
          <button
            role="tab"
            aria-selected={aba === 'estante'}
            className={`aba${aba === 'estante' ? ' ativa' : ''}`}
            onClick={() => setAba('estante')}
          >
            <IconePilha size={18} /> Já li
          </button>
        </nav>

        {aba === 'leitura' ? (
          <>
            {livro && (
              <section id="foco-corrida-corrida">
                <h2 className="secao-titulo">
                  <IconeLivroAberto size={22} /> A corrida da leitura
                </h2>
                {/* No desktop a pista sempre cabe. No celular o membro escolhe
                    entre as barras (estante) e a pista de corrida. */}
                <div className="so-desktop">
                  <PistaCorrida
                    membros={membros}
                    porUsuario={porUsuario}
                    livro={livro}
                    notas={notas}
                    meuUserId={userId}
                  />
                </div>
                <div className="so-mobile">
                  <div
                    className="seletor-modo seletor-vista"
                    role="tablist"
                    aria-label="Como ver o progresso"
                  >
                    <button
                      role="tab"
                      aria-selected={vista === 'barras'}
                      className={`seletor-opcao${vista === 'barras' ? ' ativo' : ''}`}
                      onClick={() => trocarVista('barras')}
                    >
                      Barras
                    </button>
                    <button
                      role="tab"
                      aria-selected={vista === 'corrida'}
                      className={`seletor-opcao${vista === 'corrida' ? ' ativo' : ''}`}
                      onClick={() => trocarVista('corrida')}
                    >
                      Corrida
                    </button>
                  </div>

                  {vista === 'corrida' ? (
                    <PistaCorrida
                      membros={membros}
                      porUsuario={porUsuario}
                      livro={livro}
                      notas={notas}
                      meuUserId={userId}
                    />
                  ) : (
                    <Estante
                      membros={membros}
                      porUsuario={porUsuario}
                      livro={livro}
                      meuUserId={userId}
                    />
                  )}
                </div>
                <div className="centro trocar-livro" style={{ marginTop: '2rem' }}>
                  {serieDoClube && (
                    <button
                      className="btn btn-fantasma"
                      onClick={() => setModalLivroNaSerie(true)}
                    >
                      <IconeMais size={16} />
                      Abrir outro livro da série
                    </button>
                  )}
                  <button className="btn btn-fantasma" onClick={() => setModalLivro(true)}>
                    Trocar o livro do clube
                  </button>
                </div>
              </section>
            )}

            <ProximoLivro
              userId={userId}
              membros={membros}
              livroAtual={livro?.ativo === true ? livro : null}
              proximo={proximo}
              entraNaSerie={proximoEntraNaSerie}
              porUsuario={porUsuarioProximo}
              minhaPct={minhaPorcentagem}
              quantosTerminaram={quantosTerminaram}
              aoEscolher={() => setModalProximo(true)}
              aoEditar={() => setModalEditarProximo(true)}
              aoAtualizarProgresso={() => setModalProgressoProximo(true)}
            />

            {livro && (
              <NotasParciais
                userId={userId}
                livro={livro}
                quantosAbertos={livrosAtuais.length}
                notas={notas}
                comentariosPorAlvo={comentariosPorAlvo}
                membrosPorId={membrosPorId}
                minhaPct={minhaPorcentagem}
                foco={foco}
              />
            )}

            <Mural recados={recados} membrosPorId={membrosPorId} userId={userId} />

            <Historico
              membrosPorId={membrosPorId}
              progressoPorLivro={progressoPorLivro}
            />
          </>
        ) : aba === 'novidades' ? (
          <Atividades
            atividades={atividades}
            membrosPorId={membrosPorId}
            vistoAte={destaqueAte}
            aoIrPara={irPara}
          />
        ) : aba === 'resenhas' ? (
          <Resenhas
            userId={userId}
            livrosAtuais={livrosAtuais}
            proximo={proximo}
            historico={historico}
            meuProgressoPorLivro={meuProgressoPorLivro}
            resenhasPorLivro={resenhasPorLivro}
            comentariosPorAlvo={comentariosPorAlvo}
            membrosPorId={membrosPorId}
            foco={foco}
          />
        ) : (
          <MinhaEstante
            userId={userId}
            livrosAtuais={livrosAtuais}
            proximo={proximo}
            historico={historico}
            meuProgressoPorLivro={meuProgressoPorLivro}
            resenhasPorLivro={resenhasPorLivro}
            aoVerResenhas={(livroId) =>
              irPara({ aba: 'resenhas', tipo: 'livro', id: livroId })
            }
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
      {livro && (
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
          aoCadastrar={escolherLivro}
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

      {modalProgresso && livro && (
        <AtualizarProgressoModal
          userId={userId}
          livro={livro}
          porcentagemInicial={minhaPorcentagem}
          progressoAtual={porUsuario[userId]}
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

      {modalChangelog && <ChangelogModal onFechar={fecharChangelog} />}
    </div>
  )
}
