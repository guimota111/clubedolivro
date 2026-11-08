import Modal from './Modal'
import { IconeLivroAberto } from './Icones'

// Chave de versão do changelog. Ao lançar novidades futuras, troque a versão
// para que o aviso apareça de novo uma única vez por navegador.
export const CHANGELOG_VERSAO = 'clubedolivro:changelog:2026-11-v11'

// Cada item usa um ícone (Icone) OU um emoji literal (emoji).
const NOVIDADES = [
  {
    emoji: '🧭',
    titulo: 'A Patoteca ganhou um menu',
    texto:
      'Cada assunto tem a sua página: Livro atual (corrida, notas e resenhas em sub-abas), Anteriores, Livros lidos, Patos, Mural, Próximo livro e Eleição. As novidades foram para o sininho no alto. O botão voltar do celular funciona entre as páginas.',
  },
  {
    emoji: '🏃',
    titulo: 'Ficou para trás? O livro continua lá',
    texto:
      'Em "Anteriores", cada livro encerrado abre no mesmo formato do atual — a corrida, as notas e as resenhas —, e o botão "Meu progresso" marca a sua leitura nele. Ninguém mais perde a corrida por terminar depois.',
  },
  {
    emoji: '🦆',
    titulo: 'Os patos e as contas de cada um',
    texto:
      'A página Patos é o ranking do clube e o perfil de cada leitor: quantos livros terminou, quantas vezes chegou primeiro, quanto tempo leva por livro, se costuma começar cedo ou tarde, o ritmo — e a estante do que já leu (a antiga aba "Já li" mora aqui agora).',
  },
  {
    emoji: '🏁',
    titulo: 'Livros lidos, com placar',
    texto:
      'Todos os livros que passaram pelo clube, com quem terminou primeiro, quantos terminaram, quantos começaram e pararam e quantos nem abriram — e as resenhas de cada um a um toque.',
  },
  {
    emoji: '🥁',
    titulo: 'Apuração voto a voto — e dois livros eleitos',
    texto:
      'A urna agora abre devagar: cada cédula sai com o nome de quem votou, o placar vai se mexendo na tela e as últimas chegam com rufar de tambores. No fim, pódio com confete. Uma eleição pode eleger mais de um livro: o 1º colocado é o próximo livro e o 2º entra logo atrás na fila.',
  },
  {
    emoji: '🗳️',
    titulo: 'Eleição do próximo livro',
    texto:
      'Chegou a aba Eleição. Cada membro indica até 2 livros (a busca puxa capa, autor e páginas) e defende cada um com um texto. Depois, vota em até 2 dos indicados — menos nos próprios. Ninguém vê quem indicou o quê nem a contagem até a apuração, feita com a senha da urna na frente de todo mundo. O vencedor entra na fila do próximo livro: ninguém é tirado do que está lendo.',
  },
  {
    emoji: '🦆',
    titulo: 'O clube agora se chama Patoteca',
    texto:
      'Mesmo clube, mesmas estantes, mesmas notas — só o nome e o rosto mudaram. Nada do que você escreveu saiu do lugar.',
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
      'Ligue em "Editar perfil" e o celular avisa quando alguém deixa uma nota, comenta, resenha ou termina um livro. Tocar no aviso abre exatamente o que ele conta. Você não recebe aviso do que você mesmo escreveu. No iPhone é preciso instalar o app antes (veja acima).',
  },
  {
    emoji: '📚',
    titulo: 'As resenhas agora ficam por livro',
    texto:
      'A aba virou uma prateleira de capas: toque na do livro que você quer ler. Cada uma abre quando você chega ao fim dele — as que faltam ficam com cadeado, mostrando quanto ainda falta.',
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
