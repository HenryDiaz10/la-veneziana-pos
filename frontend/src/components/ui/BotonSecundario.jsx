import BotonBase from './BotonBase.jsx'

// Botón dorado con texto oscuro para conservar el contraste.
function BotonSecundario({
  children,
  className = '',
  ...props
}) {
  return (
    <BotonBase
      {...props}
      className={[
        'bg-marca-dorado text-texto shadow-sm',
        'enabled:hover:bg-amber-400 enabled:hover:shadow-md',
        'vz-button-primary',
        className
      ].join(' ')}
    >
      {children}
    </BotonBase>
  )
}

export default BotonSecundario
