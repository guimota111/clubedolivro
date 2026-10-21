import { useState } from 'react'
import Modal from './Modal'
import { abrirEleicao } from '../lib/db'
import { anunciar } from '../lib/push'
import { textoEleicaoAberta } from '../lib/atividades'
import { conferirSenhaDaUrna } from '../lib/urna'
import { INDICACOES_POR_PESSOA, votosPorPessoa } from '../lib/eleicao'
import { CampoSenha } from './SenhaUrnaModal'
import { IconeUrna } from './Icones'

// Abre a eleição do próximo livro. Precisa da senha da urna: é uma decisão do
// clube, não de quem esbarrou no botão.
export default function AbrirEleicaoModal({ userId, onFechar, aoAbrir }) {
  const [nome, setNome] = useState('')
  const [prazoIndicacoes, setPrazoIndicacoes] = useState('')
  const [prazoVotacao, setPrazoVotacao] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function aoEnviar(e) {
    e.preventDefault()
    if (prazoIndicacoes && prazoVotacao && prazoVotacao < prazoIndicacoes) {
      setErro('A votação não pode terminar antes das indicações.')
      return
    }
    setEnviando(true)
    setErro('')
    if (!(await conferirSenhaDaUrna(senha))) {
      setErro('Senha incorreta. A senha da urna fica com quem administra o clube.')
      setEnviando(false)
      return
    }
    try {
      const nomeLimpo = nome.trim()
      const id = await abrirEleicao(userId, {
        nome: nomeLimpo,
        prazoIndicacoes: prazoIndicacoes || null,
        prazoVotacao: prazoVotacao || null,
      })
      anunciar(`eleicao-${id}`, textoEleicaoAberta(nomeLimpo))
      aoAbrir?.(id)
      onFechar()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível abrir a eleição. Tente novamente.')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Abrir uma eleição" onFechar={onFechar}>
      <p className="texto-suave" style={{ marginTop: 0 }}>
        Cada membro indica até {INDICACOES_POR_PESSOA} livros, defende cada um
        com um texto, e vota em até {votosPorPessoa(1)} dos indicados — menos nos
        próprios. Ninguém vê quem indicou o quê nem a contagem: isso só aparece
        na apuração, feita com a senha da urna.
      </p>

      <form onSubmit={aoEnviar} style={{ marginTop: '1rem' }}>
        <div className="campo">
          <label htmlFor="eleicao-nome">Nome da eleição (opcional)</label>
          <input
            id="eleicao-nome"
            type="text"
            value={nome}
            maxLength={80}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: O livro de novembro"
          />
        </div>

        <div className="campo">
          <label htmlFor="eleicao-prazo-ind">Indicações até (opcional)</label>
          <input
            id="eleicao-prazo-ind"
            type="date"
            value={prazoIndicacoes}
            onChange={(e) => setPrazoIndicacoes(e.target.value)}
          />
          <span className="campo-dica">
            Depois desse dia ninguém indica mais. Em branco, vale até a apuração.
          </span>
        </div>

        <div className="campo">
          <label htmlFor="eleicao-prazo-voto">Votação até (opcional)</label>
          <input
            id="eleicao-prazo-voto"
            type="date"
            value={prazoVotacao}
            onChange={(e) => setPrazoVotacao(e.target.value)}
          />
          <span className="campo-dica">
            Aparece como contagem regressiva na página da eleição. A apuração
            continua sendo manual, com a senha.
          </span>
        </div>

        <CampoSenha valor={senha} aoMudar={setSenha} id="eleicao-senha" />

        {erro && <div className="erro">{erro}</div>}

        <button className="btn" type="submit" disabled={enviando} style={{ width: '100%' }}>
          <IconeUrna size={18} />
          {enviando ? 'Abrindo…' : 'Abrir a eleição'}
        </button>
      </form>
    </Modal>
  )
}
