import { useEffect, useState } from 'react'
import { estadoDosAvisos, ligarAvisos, desligarAvisos } from '../lib/push'
import { IconeSino } from './Icones'

// O interruptor dos avisos no celular, dentro do "Editar perfil".
//
// Ligar é por aparelho, não por pessoa: quem usa o site no celular e no
// computador liga nos dois, se quiser. É assim que o Web Push funciona — a
// inscrição pertence ao navegador, não ao membro.

// Quando não há o que ligar, dizer POR QUE vale mais que esconder o botão:
// senão o membro fica procurando uma opção que ninguém explicou onde está.
const EXPLICACAO = {
  'sem-configuracao':
    'Os avisos ainda não foram ligados neste clube. Quem cuida do site precisa publicar o carteiro (veja worker/README.md).',
  indisponivel: 'Este navegador não sabe mostrar avisos.',
  instalar:
    'No iPhone os avisos só chegam com a Patoteca instalada na tela de início. Toque em Compartilhar, depois em “Adicionar à Tela de Início”, e abra o app por ali — o botão aparece.',
  bloqueado:
    'Os avisos estão bloqueados para este site. Para voltar atrás é preciso liberar as notificações nos ajustes do navegador.',
}

export default function AvisosNoCelular({ userId }) {
  const [estado, setEstado] = useState('carregando')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    estadoDosAvisos().then((atual) => {
      if (ativo) setEstado(atual)
    })
    return () => {
      ativo = false
    }
  }, [])

  async function alternar() {
    setOcupado(true)
    setErro('')
    try {
      // A permissão do navegador só pode ser pedida a partir deste clique.
      setEstado(estado === 'ligado' ? await desligarAvisos() : await ligarAvisos(userId))
    } catch (err) {
      console.error('Erro ao mudar os avisos:', err)
      setErro('Não foi possível mudar os avisos. Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  if (estado === 'carregando') return null

  const podeAlternar = estado === 'ligado' || estado === 'desligado'
  const ligado = estado === 'ligado'

  return (
    <div className="campo">
      <label>Avisos no celular</label>
      {podeAlternar ? (
        <>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={alternar}
            disabled={ocupado}
            style={{ width: '100%' }}
          >
            <IconeSino size={16} />
            {ocupado
              ? 'Um instante…'
              : ligado
                ? 'Parar de receber neste aparelho'
                : 'Receber avisos neste aparelho'}
          </button>
          <p className="texto-suave" style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
            {ligado
              ? 'Este aparelho avisa quando alguém deixa uma nota, comenta, escreve uma resenha ou termina um livro.'
              : 'Receba no celular quando alguém deixar uma nota, comentar ou terminar um livro.'}
          </p>
        </>
      ) : (
        <p className="texto-suave" style={{ fontSize: '0.85rem' }}>
          {EXPLICACAO[estado]}
        </p>
      )}
      {erro && <div className="erro">{erro}</div>}
    </div>
  )
}
