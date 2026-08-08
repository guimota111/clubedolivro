import { useEffect, useMemo, useRef, useState } from 'react'
import './styles/app.css'
import { obterOuCriarUserId, limparIdentidade } from './lib/identity'
import { buscarUsuario, garantirCoresDosMembros } from './lib/db'
import {
  useMembros,
  useLivroAtual,
  useProgresso,
  useMural,
  useNotas,
  useResenhas,
  useComentarios,
  useHistorico,
  useMeuProgresso,
} from './hooks/useDadosClube'
import { inicial, pctDoProgresso } from './lib/formato'
import { corDoMembro } from './lib/cores'
import { montarAtividades, contarNaoVistas } from './lib/atividades'
import { useFoco } from './hooks/useFoco'

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
  DivisoriaOrnamentada,
} from './components/Icones'

// Preferência de visualização do progresso no celular (barras ou corrida).
const CHAVE_VISTA = 'clubedolivro:vista-mobile'
// Até quando o membro já viu as novidades (milissegundos).
const CHAVE_NOVIDADES = 'clubedolivro:novidades-vistas'

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
  const [modalEditar, setModalEditar] = useState(false)
  const [modalPerfil, setModalPerfil] = useState(false)
  const [modalProgresso, setModalProgresso] = useState(false)
  const [aba, setAba] = useState('leitura') // 'leitura' | 'novidades' | 'resenhas'
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
  const { livro } = useLivroAtual()
  const { progresso, porUsuario } = useProgresso(livro?.id)
  const { recados } = useMural()
  const { notas } = useNotas(livro?.id)
  const { resenhas, porLivro: resenhasPorLivro } = useResenhas()
  const { comentarios, porAlvo: comentariosPorAlvo } = useComentarios()
  const { historico } = useHistorico()
  const { porLivro: meuProgressoPorLivro } = useMeuProgresso(userId)

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

  // Títulos de todos os livros (atual + histórico) para nomear a resenha no
  // aviso de novidades.
  const tituloPorLivroId = useMemo(() => {
    const mapa = {}
    historico.forEach((h) => {
      mapa[h.id] = h.titulo
    })
    if (livro) mapa[livro.id] = livro.titulo
    return mapa
  }, [historico, livro])

  const livrosResenhaveis = useMemo(() => {
    const conjunto = new Set()
    Object.entries(meuProgressoPorLivro).forEach(([livroId, prog]) => {
      if (pctDoProgresso(prog, 0) >= 100) conjunto.add(livroId)
    })
    return conjunto
  }, [meuProgressoPorLivro])

  const atividades = useMemo(
    () =>
      montarAtividades({
        notas,
        resenhas,
        comentarios,
        progresso,
        membrosPorId,
        livroAtual: livro,
        tituloPorLivroId,
        livrosResenhaveis,
      }),
    [
      notas,
      resenhas,
      comentarios,
      progresso,
      membrosPorId,
      livro,
      tituloPorLivroId,
      livrosResenhaveis,
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

  useFoco(foco, 'corrida')

  const minhaPorcentagem = livro
    ? pctDoProgresso(porUsuario[userId], livro.totalPaginas)
    : 0

  // Usa o doc ao vivo (onSnapshot) como fonte do perfil, com fallback para o
  // que foi carregado no início — assim edições de nome/foto aparecem na hora.
  const meuPerfil = membrosPorId[userId] || usuario
  const minhaCor = corDoMembro({ id: userId, ...meuPerfil })

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="container">
          <h1 className="titulo-clube">Clube do Livro</h1>
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
          aoAbrirCadastro={() => setModalLivro(true)}
          aoEditar={() => setModalEditar(true)}
        />

        {livro && <RelogioCiclo livro={livro} />}

        {/* Abas: leitura (pista/estante + notas), novidades e resenhas. */}
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
                <div className="centro" style={{ marginTop: '2rem' }}>
                  <button className="btn btn-fantasma" onClick={() => setModalLivro(true)}>
                    Trocar o livro do clube
                  </button>
                </div>
              </section>
            )}

            {livro && (
              <NotasParciais
                userId={userId}
                livro={livro}
                notas={notas}
                comentariosPorAlvo={comentariosPorAlvo}
                membrosPorId={membrosPorId}
                minhaPct={minhaPorcentagem}
                foco={foco}
              />
            )}

            <Mural recados={recados} membrosPorId={membrosPorId} userId={userId} />

            <Historico membrosPorId={membrosPorId} />
          </>
        ) : aba === 'novidades' ? (
          <Atividades
            atividades={atividades}
            membrosPorId={membrosPorId}
            vistoAte={destaqueAte}
            aoIrPara={irPara}
          />
        ) : (
          <Resenhas
            userId={userId}
            livroAtual={livro}
            historico={historico}
            meuProgressoPorLivro={meuProgressoPorLivro}
            resenhasPorLivro={resenhasPorLivro}
            comentariosPorAlvo={comentariosPorAlvo}
            membrosPorId={membrosPorId}
            foco={foco}
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
          temLivroAtual={!!livro}
          onFechar={() => setModalLivro(false)}
        />
      )}

      {modalEditar && livro && (
        <EditarLivroModal livro={livro} onFechar={() => setModalEditar(false)} />
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

      {modalChangelog && <ChangelogModal onFechar={fecharChangelog} />}
    </div>
  )
}
