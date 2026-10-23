import { useState } from 'react'
import { Link } from 'react-router-dom'

import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import BotonPeligro from '../components/ui/BotonPeligro.jsx'
import Badge from '../components/ui/Badge.jsx'
import DataTable from '../components/ui/DataTable.jsx'

// Datos ficticios exclusivos de la galería de desarrollo.
const filasEjemplo = [
  { id: 1, nombre: 'Producto de ejemplo A', cantidad: 2, precio: 25 },
  { id: 2, nombre: 'Producto de ejemplo B', cantidad: 10, precio: 9.5 },
  { id: 3, nombre: 'Producto de ejemplo C', cantidad: 0, precio: 125.9 },
  { id: 4, nombre: 'Producto de ejemplo D', cantidad: 3, precio: 18 }
]

const formatoMoneda = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN'
})

const columnasEjemplo = [
  {
    clave: 'nombre',
    titulo: 'Producto'
  },
  {
    clave: 'cantidad',
    titulo: 'Cantidad',
    alineacion: 'derecha',
    numerica: true
  },
  {
    clave: 'precio',
    titulo: 'Precio unitario',
    alineacion: 'derecha',
    numerica: true,
    renderizar: fila => formatoMoneda.format(fila.precio)
  }
]

// Vista de desarrollo: las pulsaciones solo cambian un mensaje local.
function Componentes() {
  const [cargando, setCargando] = useState(false)
  const [deshabilitado, setDeshabilitado] = useState(false)
  const [mensaje, setMensaje] = useState('Ningún botón pulsado.')
  // Estado independiente de las pruebas de botones.
  const [estadoTabla, setEstadoTabla] = useState('datos')

  return (
    // AdminLayout aporta el main; esta sección contiene la galería.
    <section
      aria-labelledby="titulo-componentes"
      className="vz-page vz-panel"
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

        {/* Ejemplo local: permite revisar la tabla sin consultar la API. */}
        <section
          aria-labelledby="titulo-prueba-tabla"
          className="mt-8"
        >
          <h2
            id="titulo-prueba-tabla"
            className="font-titulo text-lg font-semibold"
          >
            Tabla de datos
          </h2>

          <p className="mt-3 text-sm text-app-secundario">
            Datos ficticios para comprobar la presentación de la tabla.
          </p>

          <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
            Estado de la tabla

            <select
              value={estadoTabla}
              onChange={evento => {
                setEstadoTabla(evento.target.value)
              }}
              className="min-h-11 w-full rounded-lg border border-app-borde bg-app-superficie px-3 py-2 text-app-texto sm:max-w-xs"
            >
              <option value="datos">Con registros</option>
              <option value="cargando">Cargando</option>
              <option value="vacio">Sin registros</option>
              <option value="error">Error de consulta</option>
            </select>
          </label>

          <div className="mt-5">
            <DataTable
              titulo="Productos de demostración"
              columnas={columnasEjemplo}
              filas={estadoTabla === 'datos' ? filasEjemplo : []}
              cargando={estadoTabla === 'cargando'}
              conservarFilasDuranteCarga={false}
              error={
                estadoTabla === 'error'
                  ? 'Error simulado: no se pudieron consultar los registros.'
                  : ''
              }
              mensajeVacio="No hay productos para mostrar."
            />
          </div>
        </section>

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
