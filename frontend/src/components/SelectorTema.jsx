import BotonBase from './ui/BotonBase.jsx'
import { useTemaStore } from '../stores/tema.store.js'

// Conectar el botón compartido con la preferencia visual.
function SelectorTema({ className = '' }) {
  const tema = useTemaStore(state => state.tema)
  const alternarTema = useTemaStore(state => state.alternarTema)

  const esOscuro = tema === 'oscuro'
  const siguienteTema = esOscuro ? 'claro' : 'oscuro'

  return (
    <BotonBase
      onClick={alternarTema}
      aria-label={`Activar modo ${siguienteTema}`}
      className={[
        'border border-app-borde',
        'bg-app-superficie text-app-texto',
        'enabled:hover:bg-app-hover',
        className
      ].join(' ')}
    >
      {/* El icono es decorativo; el botón también contiene texto. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5 shrink-0"
      >
        {esOscuro ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
          </>
        ) : (
          <path d="M20.5 13.5A8.5 8.5 0 0 1 10.5 3.5a8.5 8.5 0 1 0 10 10Z" />
        )}
      </svg>

      {/* Mostrar el modo que se activará al pulsar. */}
      <span>
        {esOscuro ? 'Modo claro' : 'Modo oscuro'}
      </span>
    </BotonBase>
  )
}

export default SelectorTema