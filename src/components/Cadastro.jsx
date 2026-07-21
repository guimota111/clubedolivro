import { useState, useRef } from 'react'
import { criarUsuario } from '../lib/db'
import { enviarImagem } from '../lib/storage'
import { IconeLivroAberto, IconePena, DivisoriaOrnamentada } from './Icones'

// Tela de cadastro (só aparece na 1ª visita ou ao trocar de usuário).
export default function Cadastro({ userId, aoConcluir }) {
  const [nome, setNome] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const inputFile = useRef(null)

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
        </form>
      </div>
    </div>
  )
}
