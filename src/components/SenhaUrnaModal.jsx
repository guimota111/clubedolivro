import { useState } from 'react'
import Modal from './Modal'
import { conferirSenhaDaUrna } from '../lib/urna'
import { IconeCadeado } from './Icones'

// Pede a senha da urna antes de uma ação que mexe na eleição inteira
// (cancelar, por exemplo). Quem acerta segue; quem erra tenta de novo.
export default function SenhaUrnaModal({
  titulo = 'Senha da urna',
  explicacao,
  rotuloBotao = 'Continuar',
  onConfirmar,
  onFechar,
}) {
  const [senha, setSenha] = useState('')
  const [conferindo, setConferindo] = useState(false)
  const [erro, setErro] = useState('')

  async function aoEnviar(e) {
    e.preventDefault()
    setConferindo(true)
    setErro('')
    const ok = await conferirSenhaDaUrna(senha)
    if (!ok) {
      setErro('Senha incorreta. A senha da urna fica com quem administra o clube.')
      setConferindo(false)
      return
    }
    try {
      await onConfirmar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível concluir. Tente novamente.')
      setConferindo(false)
    }
  }

  return (
    <Modal titulo={titulo} onFechar={onFechar}>
      {explicacao && (
        <p className="texto-suave" style={{ marginTop: 0 }}>
          {explicacao}
        </p>
      )}
      <form onSubmit={aoEnviar}>
        <CampoSenha valor={senha} aoMudar={setSenha} />
        {erro && <div className="erro">{erro}</div>}
        <button className="btn" type="submit" disabled={conferindo} style={{ width: '100%' }}>
          <IconeCadeado size={16} />
          {conferindo ? 'Conferindo…' : rotuloBotao}
        </button>
      </form>
    </Modal>
  )
}

// O campo de senha, para os outros formulários da urna usarem o mesmo.
export function CampoSenha({ valor, aoMudar, id = 'senha-urna' }) {
  return (
    <div className="campo">
      <label htmlFor={id}>Senha da urna</label>
      <input
        id={id}
        type="password"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        autoComplete="off"
        placeholder="Só quem administra o clube tem"
      />
    </div>
  )
}
