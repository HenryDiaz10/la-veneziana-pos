import { useId, useRef, useState } from 'react'

import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import { registrarCategoria } from '../../services/catalogo.service.js'
import { ErrorApi } from '../../services/api.js'
import { useAuthStore } from '../../stores/auth.store.js'

const CAMPOS = [
  { nombre: 'nombre', etiqueta: 'Nombre', ejemplo: 'Pizzas' },
  { nombre: 'slug', etiqueta: 'Identificador', ejemplo: 'pizzas' }
]

function FormularioCategoria({ onCerrar, onGuardado }) {
  const prefijo = useId()
  const enCurso = useRef(false)
  const comprobarSesion = useAuthStore(state => state.comprobarSesion)

  const [pendiente, setPendiente] = useState(false)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')

  async function manejarEnvio(evento) {
    evento.preventDefault()

    // Impedir dos solicitudes aunque se pulse rápidamente.
    if (enCurso.current) return

    const formulario = evento.currentTarget
    const datosFormulario = new FormData(formulario)

    const nombre = String(datosFormulario.get('nombre') ?? '').trim()
    const slug = String(datosFormulario.get('slug') ?? '').trim()
    const erroresCampos = {}

    if (
      !nombre ||
      [...nombre].length > 100 ||
      [...nombre].some(caracter => {
        const codigo = caracter.codePointAt(0)
        return codigo <= 31 || (codigo >= 127 && codigo <= 159)
      })
    ) {
      erroresCampos.nombre = 'Escribe un nombre válido de hasta 100 caracteres.'
    }

    if (
      slug.length > 100 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {
      erroresCampos.slug =
        'Usa letras minúsculas, números y guiones entre palabras.'
    }

    setErrores(erroresCampos)
    setError('')

    if (Object.keys(erroresCampos).length > 0) {
      // Llevar el foco al primer campo que necesita corrección.
      formulario.elements
        .namedItem(Object.keys(erroresCampos)[0])
        ?.focus()
      return
    }

    enCurso.current = true
    setPendiente(true)

    let categoriaCreada

    try {
      const respuesta = await registrarCategoria({
        nombre,
        slug,
        es_para_kds: datosFormulario.has('es_para_kds')
      })

      categoriaCreada = respuesta.categoria
    } catch (errorGuardado) {
      if (
        errorGuardado instanceof ErrorApi &&
        errorGuardado.estado === 401
      ) {
        await comprobarSesion()
        return
      }

      if (
        errorGuardado instanceof ErrorApi &&
        errorGuardado.estado === 409
      ) {
        setErrores({
          slug: 'Ya existe una categoría con este identificador.'
        })
        formulario.elements.namedItem('slug')?.focus()
      } else {
        setError(
          errorGuardado instanceof ErrorApi
            ? errorGuardado.message
            : 'No se pudo guardar la categoría.'
        )
      }
    } finally {
      enCurso.current = false
      setPendiente(false)
    }

    // Avisar a la pantalla únicamente después de confirmar el alta.
    if (categoriaCreada) {
      onGuardado(categoriaCreada)
    }
  }

  return (
    <Modal
      titulo="Nueva categoría"
      descripcion="Organiza los productos del catálogo. Los campos de texto son obligatorios."
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

        <fieldset disabled={pendiente} className="space-y-5">
          {CAMPOS.map(campo => {
            const campoId = `${prefijo}-${campo.nombre}`
            const errorId = `${campoId}-error`

            return (
              <div key={campo.nombre}>
                <label
                  htmlFor={campoId}
                  className="mb-2 block text-sm font-semibold"
                >
                  {campo.etiqueta} *
                </label>

                <input
                  id={campoId}
                  name={campo.nombre}
                  type="text"
                  required
                  maxLength={100}
                  placeholder={campo.ejemplo}
                  autoCapitalize={
                    campo.nombre === 'slug' ? 'none' : 'sentences'
                  }
                  spellCheck={campo.nombre !== 'slug'}
                  aria-invalid={Boolean(errores[campo.nombre])}
                  aria-describedby={
                    errores[campo.nombre] ? errorId : undefined
                  }
                  className="min-h-11 w-full rounded-lg border border-app-borde bg-app-fondo px-3 py-3 text-app-texto"
                />

                {errores[campo.nombre] && (
                  <p
                    id={errorId}
                    role="alert"
                    className="mt-2 text-sm text-app-error"
                  >
                    {errores[campo.nombre]}
                  </p>
                )}
              </div>
            )
          })}

          <p className="text-sm text-app-secundario">
            El identificador puede ser, por ejemplo: pizzas o bebidas-frias.
          </p>

          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              name="es_para_kds"
              type="checkbox"
              defaultChecked
              className="size-5 accent-amber-700"
            />
            Enviar los productos de esta categoría a cocina
          </label>

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
              Guardar categoría
            </BotonSecundario>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}

export default FormularioCategoria