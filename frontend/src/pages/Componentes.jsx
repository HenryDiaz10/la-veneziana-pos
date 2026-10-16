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
    <main
      id="contenido-principal"
      tabIndex={-1}
      className="min-h-dvh bg-fondo px-5 py-10 text-texto"
    >
      <section
        aria-labelledby="titulo-componentes"
        className="mx-auto max-w-3xl rounded-2xl border border-borde bg-superficie p-6 sm:p-9"
      >
        <h1
          id="titulo-componentes"
          className="font-titulo text-2xl font-bold"
        >
          Componentes compartidos
        </h1>

        <p className="mt-3 text-sm text-texto-secundario">
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
          className="mt-6 rounded-xl bg-fondo p-4 text-sm text-texto-secundario"
        >
          {mensaje}
        </p>

        <Link
          to="/inicio"
          className="mt-8 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-texto hover:bg-fondo"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  )
}

export default Componentes