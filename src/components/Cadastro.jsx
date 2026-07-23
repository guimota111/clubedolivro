import { useState, useRef, useEffect } from 'react'
import { criarUsuario, listarUsuarios } from '../lib/db'
import { enviarImagem } from '../lib/storage'
import { definirUserId } from '../lib/identity'
import { inicial } from '../lib/formato'
import { IconeLivroAberto, IconePena, DivisoriaOrnamentada } from './Icones'

// Tela de cadastro / entrada (aparece quando não há identidade neste navegador).
export default function Cadastro({ userId, aoConcluir }) {
  const [nome, setNome] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const inputFile = useRef(null)

  // Membros já existentes — para entrar em outro dispositivo sem duplicar conta.
  const [membros, setMembros] = useState([])
  const [novo, setNovo] = useState(false) // mostrar o formulário de novo personagem

  useEffect(() => {
    let ativo = true
    listarUsuarios()
      .then((lista) => {
        if (!ativo) return
        const ordenada = [...lista].sort((a, b) =>
          (a.nome || '').localeCompare(b.nome || '')
        )
        setMembros(ordenada)
        // Se ainda não há ninguém, já abre direto o formulário de cadastro.
        if (ordenada.length === 0) setNovo(true)
      })
      .catch((err) => {
        console.error('Erro ao listar membros:', err)
        if (ativo) setNovo(true)
      })
    return () => {
      ativo = false
    }
  }, [])

  // Entra como um membro já existente: grava o id dele neste navegador.
  function entrarComo(membro) {
    definirUserId(membro.id)
    window.location.reload()
  }

  function aoEscolherFoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setErro('Escolha um arquivo de imagem.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setErro('A imagem deve ter no máximo 5 MB.')
      return
    }
    setErro('')
    setArquivo(f)
    setPreview(URL.createObjectURL(f))
  }

  async function aoEnviar(e) {
    e.preventDefault()
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) {
      setErro('Diga-nos como devemos chamá-lo.')
      return
    }
    setEnviando(true)
    setErro('')
    try {
      let avatarUrl = ''
      if (arquivo) {
        avatarUrl = await enviarImagem('avatares', arquivo, userId)
      }
      await criarUsuario(userId, { nome: nomeLimpo, avatarUrl })
      aoConcluir()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível concluir o cadastro. Tente novamente.')
      setEnviando(false)
    }
  }

  return (
    <div className="tela-cadastro">
      <div className="cartao-cadastro painel">
        <div className="brasao">
          <IconeLivroAberto size={52} />
        </div>
        <h1 className="centro" style={{ color: 'var(--dourado-claro)' }}>
          Clube do Livro
        </h1>
        <p className="centro texto-suave" style={{ fontStyle: 'italic', marginTop: 0 }}>
          Junte-se à leitura. Ocupe seu lugar na estante.
        </p>

        <DivisoriaOrnamentada
          style={{ width: '70%', height: 16, margin: '0.6rem auto 1.2rem', color: 'var(--dourado)' }}
        />

        {/* Entrar como membro já existente (útil ao abrir em outro aparelho). */}
        {membros.length > 0 && !novo && (
          <div className="entrar-membros">
            <p className="centro texto-suave" style={{ marginTop: 0 }}>
              Já faz parte do clube? Toque no seu nome para entrar:
            </p>
            <div className="lista-membros-entrar">
              {membros.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="chip-membro"
                  onClick={() => entrarComo(m)}
                >
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" />
                  ) : (
                    <span className="chip-inicial">{inicial(m.nome)}</span>
                  )}
                  <span className="chip-nome">{m.nome}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-fantasma"
              style={{ width: '100%', marginTop: '0.4rem' }}
              onClick={() => setNovo(true)}
            >
              <IconePena size={16} />
              Sou novo por aqui — criar personagem
            </button>
          </div>
        )}

        {novo && (
        <form onSubmit={aoEnviar}>
          <div className="avatar-preview-wrap">
            {preview ? (
              <img className="avatar-preview" src={preview} alt="Prévia do seu retrato" />
            ) : (
              <div className="avatar-preview vazio">Seu retrato aparecerá aqui</div>
            )}
            <input
              ref={inputFile}
              type="file"
              accept="image/*"
              className="escondido"
              id="foto"
              onChange={aoEscolherFoto}
            />
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => inputFile.current?.click()}
            >
              <IconePena size={18} />
              {preview ? 'Trocar foto' : 'Enviar sua foto'}
            </button>
          </div>

          <div className="campo">
            <label htmlFor="nome">Seu nome ou apelido</label>
            <input
              id="nome"
              type="text"
              maxLength={59}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Machado, a Leitora Voraz…"
              autoComplete="off"
            />
          </div>

          {erro && <div className="erro">{erro}</div>}

          <button className="btn" type="submit" disabled={enviando} style={{ width: '100%' }}>
            {enviando ? 'Entrando…' : 'Entrar para o clube'}
          </button>

          {membros.length > 0 && (
            <button
              type="button"
              className="btn-texto"
              style={{ display: 'block', margin: '0.9rem auto 0' }}
              onClick={() => setNovo(false)}
            >
              ← Já sou do clube, ver a lista de nomes
            </button>
          )}
        </form>
        )}
      </div>
    </div>
  )
}
