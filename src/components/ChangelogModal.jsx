import Modal from './Modal'
import { IconeLivroAberto } from './Icones'

// Chave de versão do changelog. Ao lançar novidades futuras, troque a versão
// para que o aviso apareça de novo uma única vez por navegador.
export const CHANGELOG_VERSAO = 'clubedolivro:changelog:2026-08-v6'

// Cada item usa um ícone (Icone) OU um emoji literal (emoji).
const NOVIDADES = [
  {
    emoji: '📚',
    titulo: 'O clube pode ler uma série inteira ao mesmo tempo',
    texto:
      'Quando os livros são de uma mesma série, o clube não precisa mais andar em fila indiana. Cadastre o volume novo com o nome da série igual ao dos que já estão em leitura e ele entra AO LADO deles — ninguém é encerrado, ninguém perde progresso e quem ficou para trás continua no livro em que está.',
  },
  {
    emoji: '🔀',
    titulo: 'Você escolhe em qual volume está',
    texto:
      'Com mais de um livro aberto, um trilho aparece logo abaixo da capa: toque no volume que você está lendo e a página inteira passa a ser dele — a corrida, o relógio do ciclo e as notas parciais. A escolha fica guardada neste aparelho, e cada pastilha mostra em quantos por cento você está.',
  },
  {
    emoji: '📝',
    titulo: 'Notas parciais em cada livro da série',
    texto:
      'Cada volume tem as suas notas, com o mesmo cadeado de sempre: elas só abrem para quem já chegou à página marcada NAQUELE livro. Nada de spoiler do terceiro volume aparecendo para quem ainda está no segundo.',
  },
  {
    emoji: '🏷️',
    titulo: 'Todo livro pode dizer de que série é',
    texto:
      'No cadastro e na edição há agora os campos de série e de número do volume. Eles aparecem acima do título nas resenhas, na sua estante e no histórico — e é por eles que os volumes ficam na ordem certa. Terminou um volume antes dos outros? Dá para encerrar só ele, pela edição do livro, sem mexer no resto da série.',
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
