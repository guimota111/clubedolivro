import Modal from './Modal'
import { IconeLivroAberto } from './Icones'

// Chave de versão do changelog. Ao lançar novidades futuras, troque a versão
// para que o aviso apareça de novo uma única vez por navegador.
export const CHANGELOG_VERSAO = 'clubedolivro:changelog:2026-08-v4'

// Cada item usa um ícone (Icone) OU um emoji literal (emoji).
const NOVIDADES = [
  {
    emoji: '⏳',
    titulo: 'O relógio agora conta para os dois lados',
    texto:
      'Toque no relógio da página inicial para alternar entre o tempo que FALTA para o prazo e o tempo que já se PASSOU desde que o ciclo do livro começou. Toque de novo para voltar — e ele lembra da sua escolha.',
  },
  {
    emoji: '🔔',
    titulo: 'Aba de novidades',
    texto:
      'Uma aba nova mostra o que o clube andou fazendo: quem reagiu a que trecho, quem comentou, quem avançou. O selo no nome da aba conta quantas novidades chegaram desde a sua última visita.',
  },
  {
    emoji: '😲',
    titulo: 'Nota só com a reação',
    texto:
      'Agora dá para publicar uma nota parcial sem escrever nada — só o emoji. Ela vira um aviso do tipo “Fulana se surpreendeu na página 200”, sem spoiler nenhum.',
  },
  {
    emoji: '📅',
    titulo: 'Data de início do livro',
    texto:
      'Ao cadastrar (ou editar) o livro do clube dá para informar quando a leitura começou. Em branco, vale o dia em que o livro entrou no site.',
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
