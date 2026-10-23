import { useEffect, useRef, useState } from 'react'
import Icono from '../ui/Icono.jsx'
import Badge from '../ui/Badge.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonPeligro from '../ui/BotonPeligro.jsx'
import ConfirmarAccionCatalogo from './ConfirmarAccionCatalogo.jsx'
import { consultarCategorias } from '../../services/catalogo.service.js'
import { ErrorApi } from '../../services/api.js'
import { useAuthStore } from '../../stores/auth.store.js'

const claseBoton = 'border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover'

function CategoriasCatalogo({ revision = 0, onResumen }) {
  const tituloRef = useRef(null)
  const comprobarSesion = useAuthStore(state => state.comprobarSesion)
  const [solicitud, setSolicitud] = useState({ pagina: 1, revision: 0 })
  const [consulta, setConsulta] = useState({ solicitud: null, revision: -1, categorias: [], paginacion: null, error: '' })
  const [confirmacion, setConfirmacion] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const cargando = consulta.solicitud !== solicitud || consulta.revision !== revision

  useEffect(() => {
    const controlador = new AbortController()
    async function cargar() {
      try {
        const respuesta = await consultarCategorias({ pagina: solicitud.pagina, limite: 20, signal: controlador.signal })
        if (controlador.signal.aborted) return
        setConsulta({ solicitud, revision, categorias: respuesta.categorias, paginacion: respuesta.paginacion, error: '' })
        onResumen?.({ total: respuesta.paginacion.total })
      } catch (error) {
        if (controlador.signal.aborted) return
        if (error instanceof ErrorApi && error.estado === 401) {
          await comprobarSesion()
          return
        }
        setConsulta({ solicitud, revision, categorias: [], paginacion: null,
          error: error instanceof ErrorApi ? error.message : 'No se pudieron consultar las categorías.' })
        onResumen?.(null)
      }
    }
    void cargar()
    return () => controlador.abort()
  }, [solicitud, revision, comprobarSesion, onResumen])

  function pedirConfirmacion(categoria, accion) {
    setMensaje('')
    setConfirmacion({ tipo: 'categoria', id: categoria.id, nombre: categoria.nombre, activo: Boolean(categoria.activa), accion })
  }

  return (
    <section aria-labelledby="titulo-categorias" className="mt-8">
      <div className="vz-section-head">
        <div>
          <h2 ref={tituloRef} tabIndex={-1} id="titulo-categorias" className="vz-section-title"><span className="vz-section-symbol"><Icono nombre="categorias"/></span>Categorías de la carta</h2>
          <p className="mt-2 text-xs text-app-secundario">Organiza tus productos. La eliminación está disponible solo sin productos asociados.</p>
        </div>
        <BotonBase disabled={cargando} className={claseBoton}
          onClick={() => setSolicitud(actual => ({ ...actual, revision: actual.revision + 1 }))}>
          <Icono nombre="actualizar"/>Actualizar categorías
        </BotonBase>
      </div>
      {mensaje && <p role="status" className="vz-notice"><Icono nombre="estado"/>{mensaje}</p>}
      {cargando && <p role="status" className={consulta.paginacion ? 'sr-only' : 'vz-panel text-sm text-app-secundario'}>Consultando categorías…</p>}
      {cargando && !consulta.paginacion ? null
        : !cargando && consulta.error ? <p role="alert" className="vz-panel text-sm text-app-error">{consulta.error}</p>
          : consulta.categorias.length === 0 ? <div className="vz-panel text-center text-sm text-app-secundario"><span className="vz-empty-icon"><Icono nombre="categorias"/></span>No hay categorías en esta página.</div>
            : <ul aria-busy={cargando} inert={cargando || undefined} className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{consulta.categorias.map(categoria => (
              <li key={categoria.id} className="vz-role-card">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="vz-section-symbol"><Icono nombre={categoria.es_para_kds ? 'pizza' : 'categorias'}/></span>
                  <Badge variante={categoria.activa ? 'exito' : 'neutro'}>{categoria.activa ? 'Activa' : 'Inactiva'}</Badge>
                </div>
                <h3 className="break-words font-titulo text-base font-bold">{categoria.nombre}</h3>
                <p className="mt-1 break-words text-xs text-app-secundario">{categoria.slug}</p>
                <p className="mt-4 text-xs text-app-secundario">{categoria.es_para_kds ? 'Preparación en cocina' : 'Sin envío a cocina'}</p>
                <div className="vz-row-actions mt-5 border-t border-app-borde pt-4">
                  <BotonBase className={claseBoton} aria-label={`${categoria.activa ? 'Desactivar' : 'Activar'} categoría ${categoria.nombre}`}
                    onClick={() => pedirConfirmacion(categoria, categoria.activa ? 'desactivar' : 'activar')}>
                    <Icono nombre="estado"/>{categoria.activa ? 'Desactivar' : 'Activar'}
                  </BotonBase>
                  <BotonPeligro aria-label={`Eliminar categoría ${categoria.nombre}`} onClick={() => pedirConfirmacion(categoria, 'eliminar')}><Icono nombre="eliminar"/>Eliminar</BotonPeligro>
                </div>
              </li>
            ))}</ul>}
      {(cargando || !consulta.error) && consulta.paginacion && (
        <nav aria-label="Paginación de categorías" className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-app-secundario">Página {consulta.solicitud.pagina} de {Math.max(1, consulta.paginacion.totalPaginas)}</p>
          <div className="flex gap-3">
            <BotonBase disabled={cargando || solicitud.pagina <= 1} className={claseBoton}
              onClick={() => setSolicitud(actual => ({ ...actual, pagina: actual.pagina - 1 }))}>Anterior</BotonBase>
            <BotonBase disabled={cargando || solicitud.pagina >= consulta.paginacion.totalPaginas || solicitud.pagina >= 10000} className={claseBoton}
              onClick={() => setSolicitud(actual => ({ ...actual, pagina: actual.pagina + 1 }))}>Siguiente</BotonBase>
          </div>
        </nav>
      )}
      {confirmacion && (
        <ConfirmarAccionCatalogo registro={confirmacion} onCerrar={() => setConfirmacion(null)}
          onCompletado={registro => {
            setConfirmacion(null)
            const resultado = { eliminar: 'eliminada', activar: 'activada', desactivar: 'desactivada' }[registro.accion]
            setMensaje(`Categoría «${registro.nombre}» ${resultado} correctamente.`)
            setSolicitud(actual => ({ ...actual,
              pagina: registro.accion === 'eliminar' && consulta.categorias.length === 1 ? Math.max(1, actual.pagina - 1) : actual.pagina,
              revision: actual.revision + 1 }))
            window.requestAnimationFrame(() => tituloRef.current?.focus())
          }} />
      )}
    </section>
  )
}

export default CategoriasCatalogo
