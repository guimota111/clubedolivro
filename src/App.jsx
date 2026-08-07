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

import Cadastro from './components/Cadastro'
import LivroAtualCard from './components/LivroAtualCard'
import Estante from './components/Estante'
import PistaCorrida from './components/PistaCorrida'
import ContagemRegressiva from './components/ContagemRegressiva'
import NotasParciais from './components/NotasParciais'
import Resenhas from './components/Resenhas'
import Mural from './components/Mural'
import Historico from './components/Historico'
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
  DivisoriaOrnamentada,
} from './components/Icones'

// Preferência de visualização do progresso no celular (barras ou corrida).
const CHAVE_VISTA = 'clubedolivro:vista-mobile'

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
  const [aba, setAba] = useState('leitura') // 'leitura' | 'resenhas'
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
  const { porUsuario } = useProgresso(livro?.id)
  const { recados } = useMural()
  const { notas } = useNotas(livro?.id)
  const { porLivro: resenhasPorLivro } = useResenhas()
  const { porAlvo: comentariosPorAlvo } = useComentarios()
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

        {livro && <ContagemRegressiva dataLimite={livro.dataLimite} />}

        {/* Abas: leitura (pista/estante + notas) e resenhas. */}
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
              <section>
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
              />
            )}

            <Mural recados={recados} membrosPorId={membrosPorId} userId={userId} />

            <Historico membrosPorId={membrosPorId} />
          </>
        ) : (
          <Resenhas
            userId={userId}
            livroAtual={livro}
            historico={historico}
            meuProgressoPorLivro={meuProgressoPorLivro}
            resenhasPorLivro={resenhasPorLivro}
            comentariosPorAlvo={comentariosPorAlvo}
            membrosPorId={membrosPorId}
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
