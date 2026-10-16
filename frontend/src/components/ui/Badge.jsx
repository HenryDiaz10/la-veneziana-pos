// Colores completos y estáticos para que Tailwind pueda detectarlos.
// Cada variante conserva contraste entre el fondo y el texto.
const VARIANTES = Object.freeze({
  neutro: 'border-slate-300 bg-slate-100 text-slate-800',
  exito: 'border-lime-300 bg-lime-100 text-lime-900',
  advertencia: 'border-amber-300 bg-amber-100 text-amber-900',
  peligro: 'border-red-300 bg-red-100 text-red-900'
})

// Etiqueta informativa; el texto comunica el estado además del color.
function Badge({
  children,
  variante = 'neutro',
  className = '',
  ...props
}) {
  // Utilizar una variante neutra si el nombre no está reconocido.
  const colores = Object.hasOwn(VARIANTES, variante)
    ? VARIANTES[variante]
    : VARIANTES.neutro

  return (
    <span
      {...props}
      className={[
        'inline-block max-w-full rounded-full border',
        'px-3 py-1 text-xs font-semibold leading-5 break-words',
        colores,
        className
      ].join(' ')}
    >
      {children}
    </span>
  )
}

export default Badge