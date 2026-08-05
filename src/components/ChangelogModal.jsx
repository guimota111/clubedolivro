import Modal from './Modal'
import {
  IconeLivroAberto,
  IconeMarcador,
  IconePena,
  IconeCoroa,
  IconeVela,
} from './Icones'

// Chave de versão do changelog. Ao lançar novidades futuras, troque a versão
// para que o aviso apareça de novo uma única vez por navegador.
export const CHANGELOG_VERSAO = 'clubedolivro:changelog:2026-08'

const NOVIDADES = [
  {
    Icone: IconePena,
    titulo: 'Resenhas ao terminar',
    texto:
      'Chegou a 100%? Uma aba de Resenhas libera para você escrever e ler o que os outros acharam — visível só para quem também terminou.',
  },
  {
    Icone: IconeMarcador,
    titulo: 'Notas parciais sem spoiler',
    texto:
      'Comente um trecho e escolha a página ou % de desbloqueio. Os outros só leem quando chegam naquele ponto da leitura.',
  },
  {
    Icone: IconeVela,
    titulo: 'Contador de prazo',
    texto:
      'Ao cadastrar o livro dá para definir a data-limite de término, com uma contagem regressiva na página inicial.',
  },
  {
    Icone: IconeCoroa,
    titulo: 'Pista de corrida',
    texto:
      'No computador, a leitura vira uma pista: cada um corre na sua raia pela sua %, e o líder leva a coroa. Passe o mouse para ver os detalhes.',
  },
]

export default function ChangelogModal({ onFechar }) {
  return (
    <Modal titulo="Novidades do clube" onFechar={onFechar}>
      <div className="centro" style={{ color: 'var(--dourado-claro)', marginBottom: '0.4rem' }}>
        <IconeLivroAberto size={34} />
      </div>
      <p className="texto-suave centro" style={{ marginTop: 0 }}>
        Atualizamos a estante! Veja o que mudou:
      </p>

      <ul className="changelog-lista">
        {NOVIDADES.map(({ Icone, titulo, texto }) => (
          <li key={titulo}>
            <span className="changelog-icone">
              <Icone size={20} />
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
