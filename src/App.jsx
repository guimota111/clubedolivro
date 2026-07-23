import { useEffect, useMemo, useState } from 'react'
import './styles/app.css'
import { obterOuCriarUserId, limparIdentidade } from './lib/identity'
import { buscarUsuario } from './lib/db'
import { useMembros, useLivroAtual, useProgresso, useMural } from './hooks/useDadosClube'
import { inicial } from './lib/formato'

import Cadastro from './components/Cadastro'
import LivroAtualCard from './components/LivroAtualCard'
import Estante from './components/Estante'
import Mural from './components/Mural'
import Historico from './components/Historico'
import CadastrarLivroModal from './components/CadastrarLivroModal'
import EditarLivroModal from './components/EditarLivroModal'
import EditarPerfilModal from './components/EditarPerfilModal'
import AtualizarProgressoModal from './components/AtualizarProgressoModal'
import {
  IconeVela,
  IconeMarcador,
  IconeLivroAberto,
  DivisoriaOrnamentada,
} from './components/Icones'

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

  return <ClubeLogado userId={userId} usuario={usuario} onTrocar={trocarUsuario} />
}

// Vista principal, já com identidade definida.
function ClubeLogado({ userId, usuario, onTrocar }) {
  const [modalLivro, setModalLivro] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalPerfil, setModalPerfil] = useState(false)
  const [modalProgresso, setModalProgresso] = useState(false)

  const { membros } = useMembros()
  const { livro } = useLivroAtual()
  const { porUsuario } = useProgresso(livro?.id)
  const { recados } = useMural()

  const membrosPorId = useMemo(() => {
    const mapa = {}
    membros.forEach((m) => {
      mapa[m.id] = m
    })
    return mapa
  }, [membros])

  const minhaPagina = livro ? porUsuario[userId] || 0 : 0

  // Usa o doc ao vivo (onSnapshot) como fonte do perfil, com fallback para o
  // que foi carregado no início — assim edições de nome/foto aparecem na hora.
  const meuPerfil = membrosPorId[userId] || usuario

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="container">
          <h1 className="titulo-clube">Clube do Livro</h1>
          <p className="subtitulo-clube">A estante viva onde lemos juntos</p>
          <DivisoriaOrnamentada className="divisoria" />

          <div className="barra-usuario">
            {meuPerfil.avatarUrl ? (
              <img className="mini-avatar" src={meuPerfil.avatarUrl} alt={meuPerfil.nome} />
            ) : (
              <span
                className="mini-avatar"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--madeira-clara)',
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

        {livro && (
          <section>
            <h2 className="secao-titulo">
              <IconeLivroAberto size={22} /> A Estante
            </h2>
            <Estante
              membros={membros}
              porUsuario={porUsuario}
              livro={livro}
              meuUserId={userId}
            />
            <div className="centro" style={{ marginTop: '2rem' }}>
              <button className="btn btn-fantasma" onClick={() => setModalLivro(true)}>
                Trocar o livro do clube
              </button>
            </div>
          </section>
        )}

        <Mural recados={recados} membrosPorId={membrosPorId} userId={userId} />

        <Historico membrosPorId={membrosPorId} />
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
          onFechar={() => setModalPerfil(false)}
        />
      )}

      {modalProgresso && livro && (
        <AtualizarProgressoModal
          userId={userId}
          livro={livro}
          paginaAtualInicial={minhaPagina}
          onFechar={() => setModalProgresso(false)}
        />
      )}
    </div>
  )
}
