import { useId } from 'react'
import Icono from './Icono.jsx'

function DataTable({ titulo, columnas, filas, obtenerClave = fila => fila.id,
  cargando = false, error = '', mensajeVacio = 'No hay registros disponibles.',
  alineacionVertical = 'superior', claseTabla = '', conservarFilasDuranteCarga = true }) {
  const tituloId = useId()
  // Conservar el alto y los registros visibles mientras llega la nueva página.
  // Los controles anteriores quedan inactivos para evitar operar sobre datos pendientes.
  const conservarFilas = cargando && conservarFilasDuranteCarga && filas.length > 0
  const alinear = alineacion => alineacion === 'derecha' ? 'text-right' : alineacion === 'centro' ? 'text-center' : 'text-left'
  return (
    <div className="min-w-0">
      {cargando && <p role="status" className={conservarFilas ? 'sr-only' : 'mb-3 text-sm text-app-secundario'}>Cargando registros…</p>}
      {!cargando && error && <p role="alert" className="mb-3 rounded-xl border border-app-borde bg-app-superficie p-4 text-sm text-app-error">{error}</p>}
      <div className="vz-table-frame">
        <div role="region" aria-labelledby={tituloId} aria-busy={cargando} tabIndex={0} className="vz-table-scroll">
          <table className={`vz-table font-sans ${claseTabla}`} inert={conservarFilas || undefined}>
            <caption id={tituloId}>{titulo}</caption>
            <thead><tr>{columnas.map(columna => <th key={columna.clave} scope="col" className={alinear(columna.alineacion)}>{columna.titulo}</th>)}</tr></thead>
            <tbody>
              {(cargando && !conservarFilas) || error || filas.length === 0 ? (
                <tr><td colSpan={columnas.length} className="vz-table-empty">
                  <span className="vz-empty-icon"><Icono nombre={error ? 'seguridad' : 'lista'}/></span>
                  <p>{cargando ? 'Esperando los registros.' : error ? 'Los registros no están disponibles.' : mensajeVacio}</p>
                </td></tr>
              ) : filas.map(fila => (
                <tr key={obtenerClave(fila)}>{columnas.map(columna => (
                  <td key={columna.clave} className={[
                    alineacionVertical === 'centro' ? 'align-middle' : 'align-top',
                    alinear(columna.alineacion), columna.numerica ? 'whitespace-nowrap tabular-nums' : 'break-words'
                  ].join(' ')}>{columna.renderizar ? columna.renderizar(fila) : (fila[columna.clave] ?? '—')}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default DataTable
