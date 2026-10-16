import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import DataTable from '../components/ui/DataTable.jsx'
import BotonBase from '../components/ui/BotonBase.jsx'
import Badge from '../components/ui/Badge.jsx'
import { consultarProductos } from '../services/catalogo.service.js'
import { ErrorApi } from '../services/api.js'
import { useAuthStore } from '../stores/auth.store.js'

import BotonSecundario from '../components/ui/BotonSecundario.jsx'
import FormularioCategoria from '../components/catalogo/FormularioCategoria.jsx'

import FormularioProducto from '../components/catalogo/FormularioProducto.jsx'
import ImagenProducto from '../components/catalogo/ImagenProducto.jsx'
import ConfirmarAccionCatalogo from '../components/catalogo/ConfirmarAccionCatalogo.jsx'
import CategoriasCatalogo from '../components/catalogo/CategoriasCatalogo.jsx'
import BotonPeligro from '../components/ui/BotonPeligro.jsx'
import Icono from '../components/ui/Icono.jsx'
import TarjetaResumen from '../components/ui/TarjetaResumen.jsx'

const moneda = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN'
})

const ESTADOS = {
  activo: { texto: 'Activo', variante: 'exito' },
  inactivo: { texto: 'Inactivo', variante: 'neutro' },
  oculto_temporal: { texto: 'Oculto temporalmente', variante: 'advertencia' }
}

const columnas = [
  {
    clave: 'nombre',
    titulo: 'Producto',
    // Agrupar foto y nombre para evitar una columna de imagen demasiado amplia.
    renderizar: producto => (
      <div className="flex min-w-52 items-center gap-3">
        <ImagenProducto
          url={producto.imagen_url}
          descripcion={`Imagen de ${producto.nombre}`}
          ajuste="cubrir"
          className="h-12 w-12 shrink-0"
        />
        <span className="min-w-0 font-semibold leading-6">
          {producto.nombre}
        </span>
      </div>
    )
  },
  {
    clave: 'sku',
    titulo: 'SKU',
    renderizar: producto => <span className="whitespace-nowrap">{producto.sku || '—'}</span>
  },
  {
    clave: 'precio_venta_base',
    titulo: 'Precio base',
    alineacion: 'derecha',
    numerica: true,
    renderizar: producto => moneda.format(Number(producto.precio_venta_base))
  },
  {
    clave: 'estado',
    titulo: 'Estado',
    renderizar: producto => {
      const estado = ESTADOS[producto.estado]

      return (
        <Badge variante={estado?.variante ?? 'neutro'}>
          {estado?.texto ?? 'Sin estado'}
        </Badge>
      )
    }
  }
]

function Catalogo() {
  const comprobarSesion = useAuthStore(state => state.comprobarSesion)
  const busquedaId = useId()
  const tituloRef = useRef(null)
  const [textoBusqueda, setTextoBusqueda] = useState('')

  const [categoriaAbierta, setCategoriaAbierta] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [confirmacion, setConfirmacion] = useState(null)
  const [revisionCategorias, setRevisionCategorias] = useState(0)
  const [resumenCategorias, setResumenCategorias] = useState(null)

    // null significa cerrado; el objeto indica creación o edición.
  const [formularioProducto, setFormularioProducto] = useState(null)

  // Cada cambio identifica una consulta nueva.
  const [solicitud, setSolicitud] = useState({
    pagina: 1,
    revision: 0,
    busqueda: '',
    espera: 0
  })

  const [consulta, setConsulta] = useState({
    solicitud: null,
    productos: [],
    paginacion: null,
    error: ''
  })

  const cargando = consulta.solicitud !== solicitud
  const error = cargando ? '' : consulta.error
  const paginacion = consulta.paginacion

  useEffect(() => {
    const controlador = new AbortController()

    async function cargarProductos() {
      try {
        const respuesta = await consultarProductos({
          pagina: solicitud.pagina,
          limite: 20,
          busqueda: solicitud.busqueda,
          signal: controlador.signal
        })

        // Descartar respuestas de consultas canceladas.
        if (controlador.signal.aborted) return

        setConsulta({
          solicitud,
          productos: respuesta.productos,
          paginacion: respuesta.paginacion,
          error: ''
        })
      } catch (errorConsulta) {
        if (controlador.signal.aborted) return

        // Recuperar el estado global si la sesión dejó de ser válida.
        if (
          errorConsulta instanceof ErrorApi &&
          errorConsulta.estado === 401
        ) {
          await comprobarSesion()
          return
        }

        setConsulta({
          solicitud,
          productos: [],
          paginacion: null,
          error: errorConsulta instanceof ErrorApi
            ? errorConsulta.message
            : 'No se pudieron consultar los productos.'
        })
      }
    }

    // Esperar a que el usuario pause la escritura antes de consultar.
    // Enter, Buscar, limpiar y paginar usan espera 0.
    const temporizador = window.setTimeout(() => {
      void cargarProductos()
    }, solicitud.espera)

    return () => {
      window.clearTimeout(temporizador)
      controlador.abort()
    }
  }, [solicitud, comprobarSesion])

    // Conservar las columnas existentes y añadir acciones por producto.
  const columnasConAcciones = [
    ...columnas,
    {
      clave: 'acciones',
      titulo: 'Acciones',
      renderizar: producto => (
        <div className="vz-row-actions">
        {producto.tipo_producto === 'plato_preparado' && <Link to={`/recetas?producto=${producto.id}`} aria-label={`Receta de ${producto.nombre}`} className="vz-button inline-flex min-h-11 items-center gap-2 rounded-lg border border-app-borde bg-app-superficie px-3 py-2 text-xs font-semibold"><Icono nombre="recetas"/>Receta</Link>}
        <BotonBase
          aria-label={`Editar ${producto.nombre}`}
          onClick={() => {
            setMensaje('')
            setFormularioProducto({ producto })
          }}
          className="border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover"
        >
          <Icono nombre="editar"/>Editar
        </BotonBase>
        <BotonBase
          aria-label={`${producto.estado === 'inactivo' ? 'Activar' : 'Desactivar'} ${producto.nombre}`}
          onClick={() => {
            setMensaje('')
            setConfirmacion({ tipo: 'producto', id: producto.id, nombre: producto.nombre,
              activo: producto.estado !== 'inactivo', accion: producto.estado === 'inactivo' ? 'activar' : 'desactivar' })
          }}
          className="border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover"
        >
          <Icono nombre="estado"/>{producto.estado === 'inactivo' ? 'Activar' : 'Desactivar'}
        </BotonBase>
        <BotonPeligro aria-label={`Eliminar ${producto.nombre}`} onClick={() => {
          setMensaje('')
          setConfirmacion({ tipo: 'producto', id: producto.id, nombre: producto.nombre,
            activo: producto.estado !== 'inactivo', accion: 'eliminar' })
        }}><Icono nombre="eliminar"/>Eliminar</BotonPeligro>
        </div>
      )
    }
  ]

  return (
    <section
      aria-labelledby="titulo-catalogo"
      className="vz-page"
    >
      <div className="vz-page-header">
        <div>
          <p className="vz-kicker"><Icono nombre="catalogo"/>Administración · Catálogo</p>
          <h1
            ref={tituloRef}
            id="titulo-catalogo"
            tabIndex={-1}
            className="vz-page-title"
          >
            Catálogo de productos
          </h1>

          <p className="vz-page-description">
            Todo lo que hace especial a La Veneziana, organizado en un solo lugar.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <BotonBase
            disabled={cargando}
            onClick={() => {
              setSolicitud(actual => ({
                ...actual,
                revision: actual.revision + 1,
                espera: 0
              }))
            }}
            className="border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover"
          >
            <Icono nombre="actualizar"/>{error ? 'Reintentar' : 'Actualizar'}
          </BotonBase>

          <BotonBase
            className="border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover"
            onClick={() => {
              setMensaje('')
              setCategoriaAbierta(true)
            }}
          >
            <Icono nombre="categorias"/>Nueva categoría
          </BotonBase>

            <BotonSecundario
            onClick={() => {
              setMensaje('')
              setFormularioProducto({ producto: null })
            }}
          >
            <Icono nombre="mas"/>Nuevo producto
          </BotonSecundario>
        </div>
      </div>

      {/* Resúmenes derivados de consultas reales, con su ámbito explícito. */}
      <div className="vz-stats">
        <TarjetaResumen titulo={solicitud.busqueda ? 'Productos encontrados' : 'Productos en catálogo'}
          valor={paginacion?.total ?? 0} pendiente={cargando || Boolean(error)}
          detalle={solicitud.busqueda ? 'Coincidencias en todo el catálogo' : 'Productos registrados en el sistema'} icono="pizza"/>
        <TarjetaResumen titulo="Activos en esta página"
          valor={consulta.productos.filter(p => p.estado === 'activo').length}
          pendiente={cargando || Boolean(error)} tono="lima" icono="estado"
          detalle={`De los ${cargando ? '—' : consulta.productos.length} productos de esta página`}/>
        <TarjetaResumen titulo="Categorías registradas" valor={resumenCategorias?.total ?? 0}
          pendiente={resumenCategorias === null} detalle="La organización de tu carta" icono="categorias" tono="rojo"/>
      </div>

      {/* Filtrar en el servidor para buscar también fuera de la página actual. */}
      <form
        role="search"
        aria-label="Buscar productos del catálogo"
        onSubmit={evento => {
          evento.preventDefault()
          setMensaje('')
          setSolicitud(actual => ({
            ...actual,
            pagina: 1,
            busqueda: textoBusqueda.trim(),
            revision: actual.revision + 1,
            espera: 0
          }))
        }}
        className="vz-search"
      >
        <label htmlFor={busquedaId} className="mb-3 block text-xs font-semibold">
          Buscar en el catálogo
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="vz-search-field">
          <Icono nombre="buscar"/>
          <input
            id={busquedaId}
            type="search"
            name="busqueda"
            value={textoBusqueda}
            onChange={evento => {
              const texto = evento.target.value
              setTextoBusqueda(texto)
              setMensaje('')
              // Cada cambio cancela el temporizador y la consulta anteriores.
              setSolicitud(actual => ({
                ...actual,
                pagina: 1,
                busqueda: texto.trim(),
                revision: actual.revision + 1,
                espera: texto.trim() ? 300 : 0
              }))
            }}
            maxLength={150}
            placeholder="Nombre, SKU o código de barras"
            aria-describedby={`${busquedaId}-ayuda`}
          />
          </div>
          <BotonSecundario type="submit"><Icono nombre="buscar"/>Buscar</BotonSecundario>
          <BotonBase
            disabled={!textoBusqueda && !solicitud.busqueda}
            onClick={() => {
              setTextoBusqueda('')
              setMensaje('')
              setSolicitud(actual => ({
                ...actual,
                pagina: 1,
                busqueda: '',
                revision: actual.revision + 1,
                espera: 0
              }))
            }}
            className="border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover"
          >
            <Icono nombre="cerrar"/>Limpiar
          </BotonBase>
        </div>
        <p id={`${busquedaId}-ayuda`} className="mt-3 text-xs text-app-secundario">
          {cargando
            ? 'Buscando productos…'
            : solicitud.busqueda
              ? `Resultados para «${solicitud.busqueda}».`
              : 'Las coincidencias aparecen al escribir nombre, SKU o código de barras.'}
        </p>
      </form>

      {mensaje && (
        <p
          role="status"
          className="vz-notice"
        >
          <Icono nombre="estado"/>{mensaje}
        </p>
      )}

      {/* Montar el modal únicamente mientras esté abierto. */}
      {categoriaAbierta && (
        <FormularioCategoria
          onCerrar={() => {
            setCategoriaAbierta(false)
          }}
          onGuardado={categoria => {
            setCategoriaAbierta(false)
            setMensaje(`Categoría «${categoria.nombre}» creada correctamente.`)
            setRevisionCategorias(actual => actual + 1)
          }}
        />
      )}

            {/* Crear y editar reutilizan el mismo formulario.
          La clave reinicia sus campos al cambiar de producto. */}
      {formularioProducto !== null && (
        <FormularioProducto
          key={formularioProducto.producto?.id ?? 'nuevo'}
          producto={formularioProducto.producto}
          onCerrar={() => {
            setFormularioProducto(null)
          }}
          onGuardado={producto => {
            const editando = formularioProducto.producto !== null

            setFormularioProducto(null)
            setMensaje(
              `Producto «${producto.nombre}» ${
                editando ? 'actualizado' : 'creado'
              } correctamente.`
            )

            // Volver a consultar los datos después del guardado real.
            setSolicitud(actual => ({
              ...actual,
              revision: actual.revision + 1,
              espera: 0
            }))
          }}
        />
      )}

      {/* DataTable presenta la página recibida del backend. */}
      <DataTable
        titulo="Productos registrados"
        alineacionVertical="centro"
        columnas={columnasConAcciones}
        filas={cargando ? [] : consulta.productos}
        cargando={cargando}
        error={error}
        mensajeVacio={solicitud.busqueda
          ? 'No se encontraron productos con esa búsqueda.'
          : 'Todavía no hay productos en esta página.'}
      />

      {!cargando && !error && paginacion && (
        <nav
          aria-label="Paginación de productos"
          className="mt-5 flex flex-wrap items-center justify-between gap-4"
        >
          <p role="status" className="text-sm text-app-secundario">
            Página {solicitud.pagina} de{' '}
            {Math.max(1, paginacion.totalPaginas)}
            {' · '}
            {paginacion.total} productos
          </p>

          <div className="flex flex-wrap gap-3">
            <BotonBase
              disabled={solicitud.pagina <= 1}
              onClick={() => {
                setSolicitud(actual => ({
                  ...actual,
                  pagina: actual.pagina - 1,
                  espera: 0
                }))
              }}
              className="border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover"
            >
              Anterior
            </BotonBase>

            <BotonBase
              disabled={
                solicitud.pagina >= paginacion.totalPaginas ||
                solicitud.pagina >= 10000
              }
              onClick={() => {
                setSolicitud(actual => ({
                  ...actual,
                  pagina: actual.pagina + 1,
                  espera: 0
                }))
              }}
              className="border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover"
            >
              Siguiente
            </BotonBase>
          </div>
        </nav>
      )}
      <CategoriasCatalogo revision={revisionCategorias} onResumen={setResumenCategorias} />

      {confirmacion && (
        <ConfirmarAccionCatalogo registro={confirmacion} onCerrar={() => setConfirmacion(null)}
          onCompletado={registro => {
            setConfirmacion(null)
            const resultado = { eliminar: 'eliminado', activar: 'activado', desactivar: 'desactivado' }[registro.accion]
            setMensaje(`Producto «${registro.nombre}» ${resultado} correctamente.`)
            setSolicitud(actual => ({ ...actual,
              pagina: registro.accion === 'eliminar' && consulta.productos.length === 1 ? Math.max(1, actual.pagina - 1) : actual.pagina,
              revision: actual.revision + 1, espera: 0 }))
            // El botón de origen puede desaparecer después de eliminar.
            window.requestAnimationFrame(() => tituloRef.current?.focus())
          }} />
      )}
    </section>
  )
}

export default Catalogo
