import Modal from './Modal'
import { IconeLivroAberto, IconeMarcador } from './Icones'

// Chave de versão do changelog. Ao lançar novidades futuras, troque a versão
// para que o aviso apareça de novo uma única vez por navegador.
export const CHANGELOG_VERSAO = 'clubedolivro:changelog:2026-08-v3'

// Cada item usa um ícone (Icone) OU um emoji literal (emoji).
const NOVIDADES = [
  {
    emoji: '🎨',
    titulo: 'Cada leitor, uma cor',
    texto:
      'Escolha a sua cor em “Editar perfil”: ela pinta a sua barra na pista e na estante, e emoldura o seu retrato. Quem já estava no clube recebeu uma cor sorteada — é só trocar se não gostar.',
  },
  {
    emoji: '✨',
    titulo: 'Dourado = leitura das últimas 24 h',
    texto:
      'A pontinha dourada da barra mostra o que você avançou nas últimas 24 horas. Bateu perna no livro ontem à noite? Todo mundo vai ver o brilho.',
  },
  {
    Icone: IconeMarcador,
    titulo: 'Seu ritmo, em números',
    texto:
      'Ao atualizar o progresso (e ao passar o mouse na pista) aparece quanto você já leu nas últimas 24 h.',
  },
  {
    emoji: '🏁',
    titulo: 'Corrida no celular',
    texto:
      'No celular agora dá para alternar entre as barras da estante e a pista de corrida — é só tocar em “Barras” ou “Corrida” acima do progresso. Sua escolha fica guardada.',
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
