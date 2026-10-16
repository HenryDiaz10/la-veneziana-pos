import { useState } from 'react'
import { Link } from 'react-router-dom'

import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import BotonPeligro from '../components/ui/BotonPeligro.jsx'
import Badge from '../components/ui/Badge.jsx'

// Vista de desarrollo: las pulsaciones solo cambian un mensaje local.
function Componentes() {
  const [cargando, setCargando] = useState(false)
  const [deshabilitado, setDeshabilitado] = useState(false)
  const [mensaje, setMensaje] = useState('Ningún botón pulsado.')

  return (
    // AdminLayout aporta el main; esta sección contiene la galería.
    <section
      aria-labelledby="titulo-componentes"
      className="mx-auto w-full max-w-4xl rounded-2xl border border-app-borde bg-app-superficie p-6 text-app-texto shadow-sm sm:p-8"
    >
        <h1
          id="titulo-componentes"
          className="font-titulo text-2xl font-bold"
        >
          Componentes compartidos
        </h1>

        <p className="mt-3 text-sm text-app-secundario">
          Vista de desarrollo. Los botones no modifican datos del sistema.
        </p>

        <h2 className="mt-8 font-titulo text-lg font-semibold">
          Etiquetas
        </h2>

        <div className="mt-4 flex flex-wrap gap-3">
          <Badge>Información</Badge>
          <Badge variante="exito">Completado</Badge>
          <Badge variante="advertencia">Pendiente</Badge>
          <Badge variante="peligro">Cancelado</Badge>
        </div>

        <h2 className="mt-8 font-titulo text-lg font-semibold">
          Estados de los botones
        </h2>

        {/* Controles externos para comprobar que los botones son puros. */}
        <div className="mt-4 flex flex-wrap gap-5">
          <label className="inline-flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={cargando}
              onChange={evento => {
                setCargando(evento.target.checked)
              }}
              className="size-5 accent-amber-700"
            />
            Estado de carga
          </label>

          <label className="inline-flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={deshabilitado}
              onChange={evento => {
                setDeshabilitado(evento.target.checked)
              }}
              className="size-5 accent-amber-700"
            />
            Deshabilitado
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-4">
          <BotonSecundario
            cargando={cargando}
            disabled={deshabilitado}
            textoCargando="Procesando ejemplo…"
            onClick={() => {
              setMensaje('Botón dorado pulsado.')
            }}
          >
            Probar botón dorado
          </BotonSecundario>

          <BotonPeligro
            cargando={cargando}
            disabled={deshabilitado}
            textoCargando="Procesando ejemplo…"
            onClick={() => {
              setMensaje('Botón rojo pulsado.')
            }}
          >
            Probar botón rojo
          </BotonPeligro>
        </div>

        {/* Anunciar el resultado sin ventanas emergentes. */}
        <p
          role="status"
          className="mt-6 rounded-xl bg-app-elevada p-4 text-sm text-app-secundario"
        >
          {mensaje}
        </p>

        <Link
          to="/inicio"
          className="mt-8 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-app-texto hover:bg-app-hover"
        >
          Volver al inicio
        </Link>
      </section>
  )
}

export default Componentes