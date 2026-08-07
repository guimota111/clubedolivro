import { useState, useRef } from 'react'
import Modal from './Modal'
import { atualizarUsuario } from '../lib/db'
import { enviarImagem } from '../lib/storage'
import { IconePena, IconeMarcador } from './Icones'
import { inicial } from '../lib/formato'
import { corDoMembro, coresEmUso } from '../lib/cores'
import SeletorCor, { PreviaBarra } from './SeletorCor'

// Modal para o membro editar seu nome, sua foto e a cor da sua barra.
export default function EditarPerfilModal({ userId, perfil, membros = [], onFechar }) {
  const [nome, setNome] = useState(perfil.nome || '')
  const [cor, setCor] = useState(() => corDoMembro({ id: userId, ...perfil }))
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const inputFile = useRef(null)

  const avatarMostrado = preview || perfil.avatarUrl || ''

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
      const dados = { nome: nomeLimpo, cor }
      if (arquivo) {
        dados.avatarUrl = await enviarImagem('avatares', arquivo, userId)
      }
      await atualizarUsuario(userId, dados)
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível salvar. Tente novamente.')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Editar perfil" onFechar={onFechar}>
      <form onSubmit={aoEnviar}>
        <div className="avatar-preview-wrap">
          {avatarMostrado ? (
            <img className="avatar-preview" src={avatarMostrado} alt="Seu retrato" />
          ) : (
            <div
              className="avatar-preview"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--fonte-titulo)',
                fontSize: '3rem',
                color: 'var(--dourado-claro)',
              }}
            >
              {inicial(nome)}
            </div>
          )}
          <input
            ref={inputFile}
            type="file"
            accept="image/*"
            className="escondido"
            onChange={aoEscolherFoto}
          />
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => inputFile.current?.click()}
          >
            <IconeMarcador size={18} />
            {avatarMostrado ? 'Trocar foto' : 'Enviar foto'}
          </button>
        </div>

        <div className="campo">
          <label htmlFor="perfil-nome">Seu nome ou apelido</label>
          <input
            id="perfil-nome"
            type="text"
            maxLength={59}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Machado, a Leitora Voraz…"
            autoComplete="off"
          />
        </div>

        <SeletorCor
          valor={cor}
          aoEscolher={setCor}
          coresUsadas={coresEmUso(membros, userId)}
        />

        <PreviaBarra cor={cor} />

        {erro && <div className="erro">{erro}</div>}

        <button className="btn" type="submit" disabled={enviando} style={{ width: '100%' }}>
          <IconePena size={16} />
          {enviando ? 'Salvando…' : 'Salvar perfil'}
        </button>
      </form>
    </Modal>
  )
}
