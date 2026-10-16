// Base compartida para los botones del sistema.
// El componente recibe su estado; no ejecuta solicitudes ni guarda datos.
function BotonBase({
  children,
  type = 'button',
  disabled = false,
  cargando = false,
  textoCargando = 'Procesando…',
  className = '',
  ...props
}) {
  // Una operación pendiente también impide nuevas pulsaciones.
  const bloqueado = disabled || cargando

  return (
    <button
      {...props}

      // Por defecto no enviar formularios accidentalmente.
      // Para un envío explícito, utilizar type="submit".
      type={type}
      disabled={bloqueado}
      aria-busy={cargando || undefined}
      className={[
        'vz-button',
        'inline-flex min-h-11 items-center justify-center gap-2',
        'rounded-xl px-5 py-3 text-sm font-semibold leading-5',
        'transition-[background-color,box-shadow,transform] duration-150',
        'motion-safe:enabled:hover:-translate-y-0.5',
        'motion-safe:enabled:active:scale-[0.98]',
        'motion-reduce:transition-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      ].join(' ')}
    >
      {/* Comunicar la operación pendiente sin depender solo del color. */}
      {cargando ? textoCargando : children}
    </button>
  )
}

export default BotonBase
