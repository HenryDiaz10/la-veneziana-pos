import { useId } from 'react'

// Tabla de presentación: recibe datos y columnas.
// Las consultas y la paginación pertenecen a la página que la utiliza.
function DataTable({
  titulo,
  columnas,
  filas,
  obtenerClave = fila => fila.id,
  cargando = false,
  error = '',
  mensajeVacio = 'No hay registros disponibles.'
}) {
  const tituloId = useId()

  // Usar clases completas para que Tailwind pueda detectarlas.
  function obtenerAlineacion(alineacion) {
    if (alineacion === 'derecha') {
      return 'text-right'
    }

    if (alineacion === 'centro') {
      return 'text-center'
    }

    return 'text-left'
  }

  return (
    <div className="min-w-0">
      {/* Comunicar los estados también mediante texto. */}
      {cargando && (
        <p role="status" className="mb-3 text-sm text-app-secundario">
          Cargando registros…
        </p>
      )}

      {!cargando && error && (
        <p role="alert" className="mb-3 text-sm text-app-error">
          {error}
        </p>
      )}

      {/* El desplazamiento horizontal se limita a la tabla.
          El contenedor admite navegación mediante teclado. */}
      <div
        role="region"
        aria-labelledby={tituloId}
        aria-busy={cargando}
        tabIndex={0}
        className="overflow-x-auto rounded-xl border border-app-borde"
      >
        <table className="w-full border-collapse font-sans text-sm text-app-texto">
          <caption
            id={tituloId}
            className="border-b border-app-borde bg-app-superficie px-4 py-4 text-left font-semibold"
          >
            {titulo}
          </caption>

          <thead className="bg-app-elevada">
            <tr>
              {columnas.map(columna => (
                <th
                  key={columna.clave}
                  scope="col"
                  className={[
                    'border-b border-app-borde px-4 py-3 font-semibold',
                    obtenerAlineacion(columna.alineacion)
                  ].join(' ')}
                >
                  {columna.titulo}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {cargando || error || filas.length === 0 ? (
              <tr>
                <td
                  colSpan={columnas.length}
                  className="bg-app-superficie px-4 py-8 text-center text-app-secundario"
                >
                  {cargando
                    ? 'Esperando los registros.'
                    : error
                      ? 'Los registros no están disponibles.'
                      : mensajeVacio}
                </td>
              </tr>
            ) : (
              filas.map(fila => (
                <tr
                  key={obtenerClave(fila)}
                  className="odd:bg-app-superficie even:bg-app-elevada hover:bg-app-hover"
                >
                  {columnas.map(columna => (
                    <td
                      key={columna.clave}
                      className={[
                        'border-b border-app-borde px-4 py-3 align-top',
                        obtenerAlineacion(columna.alineacion),
                        columna.numerica
                          ? 'whitespace-nowrap tabular-nums'
                          : 'break-words'
                      ].join(' ')}
                    >
                      {/* La columna puede personalizar su contenido,
                          por ejemplo para mostrar importes o etiquetas. */}
                      {columna.renderizar
                        ? columna.renderizar(fila)
                        : (fila[columna.clave] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable