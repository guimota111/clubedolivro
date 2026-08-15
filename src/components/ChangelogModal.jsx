import Modal from './Modal'
import { IconeLivroAberto } from './Icones'

// Chave de versão do changelog. Ao lançar novidades futuras, troque a versão
// para que o aviso apareça de novo uma única vez por navegador.
export const CHANGELOG_VERSAO = 'clubedolivro:changelog:2026-08-v5'

// Cada item usa um ícone (Icone) OU um emoji literal (emoji).
const NOVIDADES = [
  {
    emoji: '🔓',
    titulo: 'Terminou? Já dá para emendar no próximo',
    texto:
      'Quem chega aos 100% do livro do clube destrava a área “O próximo livro”: lá dá para escolher, junto com os outros que terminaram, qual será a próxima leitura e já começar a marcar progresso nela — sem esperar o clube virar a página. A corrida do livro de agora continua igual.',
  },
  {
    emoji: '👑',
    titulo: 'A troca de livro não zera mais quem se adiantou',
    texto:
      'Quando o clube decidir virar a página, é só apertar “Tornar o livro do clube” na área do próximo livro: o atual vai para o histórico com o vencedor da rodada e quem já vinha lendo o novo mantém tudo o que andou.',
  },
  {
    emoji: '📚',
    titulo: 'Aba “Já li”: a sua estante',
    texto:
      'Uma aba nova reúne os livros do clube que VOCÊ levou até o fim, do mais recente ao mais antigo, com a data em que você terminou e a sua nota. De lá dá para pular direto para a resenha de cada um.',
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
