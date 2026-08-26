import Modal from './Modal'
import { IconeLivroAberto } from './Icones'

// Chave de versão do changelog. Ao lançar novidades futuras, troque a versão
// para que o aviso apareça de novo uma única vez por navegador.
export const CHANGELOG_VERSAO = 'clubedolivro:changelog:2026-08-v7'

// Cada item usa um ícone (Icone) OU um emoji literal (emoji).
const NOVIDADES = [
  {
    emoji: '🦆',
    titulo: 'O clube agora se chama Patoteca',
    texto:
      'Mesmo clube, mesmas estantes, mesmas notas — nome novo e um rosto para chamar de seu. Nada do que você já escreveu mudou de lugar.',
  },
  {
    emoji: '📲',
    titulo: 'A Patoteca cabe na tela de início',
    texto:
      'Dá para instalar o clube como um app de verdade, com ícone próprio e sem a barra do navegador. No iPhone: toque em Compartilhar e em "Adicionar à Tela de Início". No Android, o Chrome oferece sozinho.',
  },
  {
    emoji: '🔔',
    titulo: 'Avisos no seu celular',
    texto:
      'Ligue em "Editar perfil" e o celular avisa quando alguém deixa uma nota, comenta, escreve uma resenha, termina um livro ou o clube começa uma leitura nova. Tocar no aviso abre exatamente o que ele conta. Você nunca recebe aviso do que você mesmo escreveu, e progresso comum não vira notificação — só a linha de chegada. No iPhone é preciso instalar o app na tela de início antes (veja acima).',
  },
]

export default function ChangelogModal({ onFechar }) {
  return (
    <Modal titulo="Novidades do clube" onFechar={onFechar}>
      <div className="centro" style={{ color: 'var(--dourado-claro)', marginBottom: '0.4rem' }}>
        <IconeLivroAberto size={34} />
      </div>
      <p className="texto-suave centro" style={{ marginTop: 0 }}>
        Mais novidades na estante! Veja o que chegou:
      </p>

      <ul className="changelog-lista">
        {NOVIDADES.map(({ Icone, emoji, titulo, texto }) => (
          <li key={titulo}>
            <span className="changelog-icone">
              {emoji ? (
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{emoji}</span>
              ) : (
                <Icone size={20} />
              )}
            </span>
            <div>
              <strong>{titulo}</strong>
              <p>{texto}</p>
            </div>
          </li>
        ))}
      </ul>

      <button className="btn" onClick={onFechar} style={{ width: '100%' }}>
        Bora ler!
      </button>
    </Modal>
  )
}
