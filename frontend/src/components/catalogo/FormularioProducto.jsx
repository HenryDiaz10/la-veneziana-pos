import { useId, useRef, useState } from 'react'

import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import SelectorCategoria from './SelectorCategoria.jsx'
import ImagenProducto from './ImagenProducto.jsx'
import {
  registrarProducto,
  editarProducto
} from '../../services/catalogo.service.js'
import { ErrorApi } from '../../services/api.js'
import { useAuthStore } from '../../stores/auth.store.js'

const CAMPOS = [
  {
    nombre: 'nombre',
    etiqueta: 'Nombre *',
    maximo: 150,
    ejemplo: 'Pizza americana'
  },
  {
    nombre: 'sku',
    etiqueta: 'SKU',
    maximo: 50,
    ejemplo: 'PIZ-001'
  },
  {
    nombre: 'precio_venta_base',
    etiqueta: 'Precio base en soles *',
    maximo: 13,
    ejemplo: '25.50'
  },
  {
    nombre: 'imagen_url',
    etiqueta: 'URL de la imagen',
    maximo: 255,
    ejemplo: 'https://ejemplo.com/pizza.jpg'
  }
]

function contieneControles(texto) {
  return [...texto].some(caracter => {
    const codigo = caracter.codePointAt(0)
    return codigo <= 31 || (codigo >= 127 && codigo <= 159)
  })
}

function FormularioProducto({
  producto = null,
  onCerrar,
  onGuardado
}) {
  const prefijo = useId()
  const enCurso = useRef(false)
  const comprobarSesion = useAuthStore(state => state.comprobarSesion)

  const [categoriaId, setCategoriaId] = useState(
    producto ? String(producto.categoria_id) : ''
  )
  const [pendiente, setPendiente] = useState(false)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  // Actualizar la vista previa al escribir, sin esperar a guardar.
  const [imagenUrl, setImagenUrl] = useState(producto?.imagen_url ?? '')

  const editando = producto !== null
  const claseCampo =
    'min-h-11 w-full rounded-lg border border-app-borde bg-app-fondo px-3 py-3 text-app-texto'

  async function manejarEnvio(evento) {
    evento.preventDefault()
    if (enCurso.current) return

    const formulario = evento.currentTarget
    const entrada = new FormData(formulario)
    const texto = campo => String(entrada.get(campo) ?? '').trim()

    const datos = {
      nombre: texto('nombre'),
      sku: texto('sku') || null,
      precio_venta_base: texto('precio_venta_base'),
      categoria_id: Number(categoriaId),
      imagen_url: texto('imagen_url') || null,
      descripcion: texto('descripcion') || null,
      estado: texto('estado')
    }

    const erroresCampos = {}

    if (
      !datos.nombre ||
      [...datos.nombre].length > 150 ||
      contieneControles(datos.nombre)
    ) {
      erroresCampos.nombre = 'Escribe un nombre válido de hasta 150 caracteres.'
    }

    if (
      datos.sku !== null &&
      ([...datos.sku].length > 50 || contieneControles(datos.sku))
    ) {
      erroresCampos.sku = 'El SKU debe tener hasta 50 caracteres válidos.'
    }

    // Conservar el precio como texto; no redondear una entrada inválida.
    if (!/^(0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(datos.precio_venta_base)) {
      erroresCampos.precio_venta_base =
        'Indica un precio no negativo con hasta dos decimales. Ejemplo: 25.50.'
    }

    if (
      !Number.isSafeInteger(datos.categoria_id) ||
      datos.categoria_id <= 0 ||
      datos.categoria_id > 2147483647
    ) {
      erroresCampos.categoria_id = 'Selecciona una categoría.'
    }

    if (datos.imagen_url !== null) {
      try {
        const url = new URL(datos.imagen_url)

        if (
          datos.imagen_url.length > 255 ||
          contieneControles(datos.imagen_url) ||
          /\s/.test(datos.imagen_url) ||
          !['http:', 'https:'].includes(url.protocol) ||
          url.username ||
          url.password
        ) {
          erroresCampos.imagen_url =
            'Usa una URL HTTP o HTTPS válida, sin espacios ni credenciales.'
        }
      } catch {
        erroresCampos.imagen_url = 'Escribe una URL completa y válida.'
      }
    }

    if (
      datos.descripcion !== null &&
      (
        [...datos.descripcion].length > 5000 ||
        contieneControles(datos.descripcion.replace(/[\r\n]/g, ''))
      )
    ) {
      erroresCampos.descripcion =
        'La descripción admite hasta 5000 caracteres válidos.'
    }

    if (!['activo', 'inactivo', 'oculto_temporal'].includes(datos.estado)) {
      erroresCampos.estado = 'Selecciona un estado válido.'
    }

    setErrores(erroresCampos)
    setError('')

    if (Object.keys(erroresCampos).length > 0) {
      formulario.elements
        .namedItem(Object.keys(erroresCampos)[0])
        ?.focus()
      return
    }

    enCurso.current = true
    setPendiente(true)

    let productoGuardado

    try {
      const respuesta = editando
        ? await editarProducto(producto.id, datos)
        : await registrarProducto(datos)

      productoGuardado = respuesta.producto
    } catch (errorGuardado) {
      if (
        errorGuardado instanceof ErrorApi &&
        errorGuardado.estado === 401
      ) {
        await comprobarSesion()
        return
      }

      setError(
        errorGuardado instanceof ErrorApi
          ? errorGuardado.message
          : 'No se pudo guardar el producto.'
      )
    } finally {
      enCurso.current = false
      setPendiente(false)
    }

    // Actualizar la tabla solo después de confirmar el guardado.
    if (productoGuardado) {
      onGuardado(productoGuardado)
    }
  }

  return (
    <Modal
      titulo={editando ? 'Editar producto' : 'Nuevo producto'}
      descripcion="Los campos marcados con * son obligatorios."
      bloqueado={pendiente}
      onCerrar={onCerrar}
    >
      <form onSubmit={manejarEnvio} noValidate aria-busy={pendiente}>
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-app-elevada p-4 text-sm text-app-error"
          >
            {error}
          </p>
        )}

        <fieldset disabled={pendiente} className="vz-product-form">
          {CAMPOS.map(campo => {
            const campoId = `${prefijo}-${campo.nombre}`

            return (
              <div key={campo.nombre}>
                <label
                  htmlFor={campoId}
                  className="mb-2 block text-sm font-semibold"
                >
                  {campo.etiqueta}
                </label>

                <input
                  id={campoId}
                  name={campo.nombre}
                  type="text"
                  inputMode={
                    campo.nombre === 'precio_venta_base'
                      ? 'decimal'
                      : undefined
                  }
                  required={
                    campo.nombre === 'nombre' ||
                    campo.nombre === 'precio_venta_base'
                  }
                  maxLength={campo.maximo}
                  placeholder={campo.ejemplo}
                  defaultValue={producto?.[campo.nombre] ?? ''}
                  onChange={campo.nombre === 'imagen_url'
                    ? evento => setImagenUrl(evento.target.value)
                    : undefined}
                  aria-invalid={Boolean(errores[campo.nombre])}
                  aria-describedby={
                    errores[campo.nombre]
                      ? `${campoId}-error`
                      : undefined
                  }
                  className={claseCampo}
                />

                {errores[campo.nombre] && (
                  <p
                    id={`${campoId}-error`}
                    role="alert"
                    className="mt-2 text-sm text-app-error"
                  >
                    {errores[campo.nombre]}
                  </p>
                )}

                {campo.nombre === 'imagen_url' && (
                  <div className="mt-3">
                    <p className="mb-2 text-sm text-app-secundario">
                      Vista previa. Usa el enlace directo a una imagen pública,
                      no la dirección de una página de resultados.
                    </p>
                    <ImagenProducto
                      url={imagenUrl}
                      descripcion="Vista previa de la imagen del producto"
                      className="h-44 w-full"
                    />
                  </div>
                )}
              </div>
            )
          })}

          <SelectorCategoria
            id={`${prefijo}-categoria`}
            valor={categoriaId}
            onChange={setCategoriaId}
            disabled={pendiente}
            error={errores.categoria_id}
          />

          <div>
            <label
              htmlFor={`${prefijo}-descripcion`}
              className="mb-2 block text-sm font-semibold"
            >
              Descripción
            </label>

            <textarea
              id={`${prefijo}-descripcion`}
              name="descripcion"
              rows={3}
              maxLength={5000}
              defaultValue={producto?.descripcion ?? ''}
              aria-invalid={Boolean(errores.descripcion)}
              aria-describedby={
                errores.descripcion
                  ? `${prefijo}-descripcion-error`
                  : undefined
              }
              className={claseCampo}
            />

            {errores.descripcion && (
              <p
                id={`${prefijo}-descripcion-error`}
                role="alert"
                className="mt-2 text-sm text-app-error"
              >
                {errores.descripcion}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={`${prefijo}-estado`}
              className="mb-2 block text-sm font-semibold"
            >
              Estado *
            </label>

            <select
              id={`${prefijo}-estado`}
              name="estado"
              required
              defaultValue={producto?.estado ?? 'activo'}
              aria-invalid={Boolean(errores.estado)}
              aria-describedby={
                errores.estado ? `${prefijo}-estado-error` : undefined
              }
              className={claseCampo}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="oculto_temporal">Oculto temporalmente</option>
            </select>

            {errores.estado && (
              <p
                id={`${prefijo}-estado-error`}
                role="alert"
                className="mt-2 text-sm text-app-error"
              >
                {errores.estado}
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-app-borde pt-5">
            <BotonBase
              onClick={onCerrar}
              className="border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover"
            >
              Cancelar
            </BotonBase>

            <BotonSecundario
              type="submit"
              cargando={pendiente}
              textoCargando="Guardando…"
            >
              Guardar producto
            </BotonSecundario>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}

export default FormularioProducto
