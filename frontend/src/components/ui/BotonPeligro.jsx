import BotonBase from './BotonBase.jsx'

// Botón para acciones destructivas.
// El rojo oscuro permite utilizar texto blanco con buen contraste.
function BotonPeligro({
  children,
  className = '',
  ...props
}) {
  return (
    <BotonBase
      {...props}
      className={[
        'bg-error-texto text-white shadow-sm',
        'enabled:hover:bg-red-800 enabled:hover:shadow-md',
        className
      ].join(' ')}
    >
      {children}
    </BotonBase>
  )
}

export default BotonPeligro