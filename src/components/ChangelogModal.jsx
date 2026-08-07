import Modal from './Modal'
import { IconeLivroAberto, IconeMarcador, IconePena } from './Icones'

// Chave de versão do changelog. Ao lançar novidades futuras, troque a versão
// para que o aviso apareça de novo uma única vez por navegador.
export const CHANGELOG_VERSAO = 'clubedolivro:changelog:2026-08-v2'

// Cada item usa um ícone (Icone) OU um emoji literal (emoji).
const NOVIDADES = [
  {
    Icone: IconePena,
    titulo: 'Comentários',
    texto:
      'Agora dá para comentar nas resenhas e nas notas parciais dos outros — puxe conversa embaixo de cada uma.',
  },
  {
    emoji: '🤯',
    titulo: 'Reações nas notas',
    texto:
      'Ao escrever uma nota parcial, escolha um emoji de reação. Todos veem a carinha (mesmo quem ainda não desbloqueou o texto) — inclusive na sua trilha da pista.',
  },
  {
    Icone: IconeMarcador,
    titulo: 'Editar e excluir notas',
    texto:
      'Suas notas parciais agora podem ser editadas ou apagadas quando quiser (e os comentários da nota vão junto ao excluir).',
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
