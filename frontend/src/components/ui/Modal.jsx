import { useEffect, useId, useRef } from 'react'

import BotonBase from './BotonBase.jsx'
import Icono from './Icono.jsx'

// Montar este componente únicamente mientras el modal esté abierto.
// El diálogo nativo mantiene el foco dentro y bloquea el fondo.
function Modal({
  titulo,
  descripcion,
  children,
  onCerrar,
  bloqueado = false
}) {
  const dialogoRef = useRef(null)
  const encabezadoRef = useRef(null)
  const tituloId = useId()
  const descripcionId = useId()

  useEffect(() => {
    const dialogo = dialogoRef.current
    const desbordamientoAnterior = document.body.style.overflow

    dialogo.showModal()
    document.body.style.overflow = 'hidden'

    // Dar contexto antes de recorrer los campos con Tab.
    encabezadoRef.current?.focus()

    return () => {
      // Cerrar el diálogo devuelve el foco al control que lo abrió.
      dialogo.close()
      document.body.style.overflow = desbordamientoAnterior
    }
  }, [])

  function manejarCancelacion(evento) {
    // Controlar Escape mediante el estado de la pantalla.
    evento.preventDefault()

    if (!bloqueado) {
      onCerrar()
    }
  }

  return (
    <dialog
      ref={dialogoRef}
      aria-labelledby={tituloId}
      aria-describedby={descripcion ? descripcionId : undefined}
      onCancel={manejarCancelacion}
      className="app-shell vz-modal m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto border border-app-borde bg-app-superficie p-0 text-app-texto"
    >
      <div className="vz-modal-heading border-b border-app-borde p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2
            ref={encabezadoRef}
            id={tituloId}
            tabIndex={-1}
            className="min-w-0 break-words font-titulo text-xl font-bold"
          >
            {titulo}
          </h2>

          <BotonBase
            disabled={bloqueado}
            onClick={onCerrar}
            aria-label="Cerrar ventana"
            className="shrink-0 border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover"
          >
            <Icono nombre="cerrar"/>
          </BotonBase>
        </div>

        {descripcion && (
          <p
            id={descripcionId}
            className="mt-3 text-sm text-app-secundario"
          >
            {descripcion}
          </p>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {children}
      </div>
    </dialog>
  )
}

export default Modal
