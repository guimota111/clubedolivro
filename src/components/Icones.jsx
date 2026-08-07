// Ícones customizados em SVG — nada de emoji genérico.
// Todos herdam a cor via `currentColor`.

export function IconeVela({ size = 24, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* chama */}
      <path
        d="M12 2c1.6 1.5 2.4 2.9 2.4 4.2A2.4 2.4 0 0 1 12 8.6a2.4 2.4 0 0 1-2.4-2.4C9.6 4.9 10.4 3.5 12 2Z"
        fill="currentColor"
        stroke="none"
      />
      {/* corpo da vela */}
      <path d="M8.5 10.5h7v9a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
      <path d="M12 8.6v1.9" />
      <path d="M8.5 13.5h7" />
    </svg>
  )
}

export function IconePena({ size = 24, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 4c-6 .5-10 3.5-12.5 7.5C6 14 5 17 4.5 19.5" />
      <path d="M20 4c-.5 6-3 10.5-8 12.5-2 .8-4.5 1.2-6.5 1" />
      <path d="M8 16c2.5-.3 4.8-1.2 6.5-2.8" />
      <path d="M4.5 19.5 3 21" />
    </svg>
  )
}

export function IconeLivro({ size = 24, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19a1 1 0 0 1 1 1v14.5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2V4.5Z" />
      <path d="M6 19.5H20" />
      <path d="M8 7h8M8 10h6" />
    </svg>
  )
}

export function IconeLivroAberto({ size = 24, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 6.5C10.5 5 8 4.3 4.5 4.5v13c3.5-.2 6 .5 7.5 2 1.5-1.5 4-2.2 7.5-2v-13C16 4.3 13.5 5 12 6.5Z" />
      <path d="M12 6.5v13" />
    </svg>
  )
}

export function IconeCoroa({ size = 24, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M3 8.5 6 14h12l3-5.5-4.2 3L12 5.5 7.2 11.5 3 8.5Z" />
      <rect x="6" y="15" width="12" height="2.4" rx="0.6" />
    </svg>
  )
}

export function IconeMarcador({ size = 24, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

// Seta de expandir/recolher. Aponta para baixo; o CSS gira quando abre.
export function IconeSeta({ size = 24, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// Filigrana / ornamento de canto (decorativo).
export function Filigrana({ size = 60, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      {...props}
    >
      <path d="M4 4c14 0 22 6 24 22" />
      <path d="M4 4c0 14 6 22 22 24" />
      <path d="M4 4c8 1 12 5 13 13" opacity="0.6" />
      <circle cx="6" cy="6" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Divisória ornamentada estilo "lombada" — usada entre seções.
export function DivisoriaOrnamentada({ ...props }) {
  return (
    <svg
      viewBox="0 0 240 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="10" y1="8" x2="96" y2="8" />
      <line x1="144" y1="8" x2="230" y2="8" />
      <path d="M108 8c4-4 8-4 12 0-4 4-8 4-12 0Z" fill="currentColor" />
      <path d="M132 8c-4-4-8-4-12 0 4 4 8 4 12 0Z" fill="currentColor" />
      <circle cx="120" cy="8" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
