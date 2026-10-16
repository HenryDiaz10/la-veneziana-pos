import { useId, useRef, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import { ErrorApi } from '../../services/api.js'
import { useAuthStore } from '../../stores/auth.store.js'
import { guardarCliente, guardarDireccion } from '../../services/clientes.service.js'
import { validarCliente, validarDireccion } from './validacion.js'

const CAMPOS_CLIENTE = [
  { nombre: 'nombres', etiqueta: 'Nombres', max: 150, requerido: true, auto: 'given-name' },
  { nombre: 'apellidos', etiqueta: 'Apellidos', max: 150, auto: 'family-name' },
  { nombre: 'tipo_documento', etiqueta: 'Tipo de documento', opciones: ['DNI', 'CE', 'PASAPORTE', 'RUC'] },
  { nombre: 'numero_documento', etiqueta: 'Número de documento', max: 20, ayuda: 'DNI: 8 dígitos · RUC: 11 · CE/Pasaporte: 5 a 20 letras o números.' },
  { nombre: 'telefono_principal', etiqueta: 'Teléfono', max: 20, auto: 'tel', tipo: 'tel', ayuda: 'Escribe el número completo, sin espacios ni guiones.' }
]
const CAMPOS_DIRECCION = [
  { nombre: 'alias', etiqueta: 'Nombre de la dirección', max: 50, ejemplo: 'Casa, trabajo…' },
  { nombre: 'direccion_completa', etiqueta: 'Dirección completa', max: 255, requerido: true, auto: 'street-address' },
  { nombre: 'referencia', etiqueta: 'Referencia', max: 255, ejemplo: 'Piso, puerta o punto de referencia' },
  { nombre: 'coordenadas_gps', etiqueta: 'Coordenadas GPS (opcional)', max: 100, ejemplo: '-12.0464,-77.0428', ayuda: 'Latitud,longitud. No es necesario compartir la ubicación del dispositivo.' },
  { nombre: 'es_predeterminada', etiqueta: 'Usar como dirección principal', tipo: 'checkbox' }
]
const claseCampo = 'min-h-11 w-full rounded-lg border border-app-borde bg-app-fondo px-3 py-3 text-sm text-app-texto'

// Compartir validación, errores, bloqueo de envíos y accesibilidad de los formularios.
export default function FormularioDatosCliente({ modo = 'cliente', registro, clienteId, onCerrar, onGuardado }) {
  const direccion = modo === 'direccion'
  const campos = direccion ? CAMPOS_DIRECCION : CAMPOS_CLIENTE
  const prefijo = useId()
  const enCurso = useRef(false)
  const [pendiente, setPendiente] = useState(false)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const comprobarSesion = useAuthStore(s => s.comprobarSesion)

  async function enviar(evento) {
    evento.preventDefault()
    if (enCurso.current) return
    const formulario = evento.currentTarget
    const captura = new FormData(formulario)
    const datos = Object.fromEntries(campos.map(campo => {
      if (campo.tipo === 'checkbox') return [campo.nombre, captura.has(campo.nombre)]
      let valor = String(captura.get(campo.nombre) ?? '').trim()
      if (campo.nombre === 'numero_documento') valor = valor.toUpperCase()
      if (campo.nombre === 'coordenadas_gps') valor = valor.replace(/\s/g, '')
      return [campo.nombre, valor || (campo.requerido ? '' : null)]
    }))
    const nuevosErrores = direccion ? validarDireccion(datos) : validarCliente(datos)
    setErrores(nuevosErrores)
    setError('')
    if (Object.keys(nuevosErrores).length) {
      formulario.elements.namedItem(Object.keys(nuevosErrores)[0])?.focus()
      return
    }
    enCurso.current = true
    setPendiente(true)
    let respuesta
    try {
      respuesta = direccion ? await guardarDireccion(clienteId, registro, datos) : await guardarCliente(registro, datos)
    } catch (fallo) {
      if (fallo instanceof ErrorApi && fallo.estado === 401) await comprobarSesion()
      setError(fallo instanceof ErrorApi ? fallo.message : 'No se pudo guardar. Inténtalo nuevamente.')
      if (!direccion && fallo instanceof ErrorApi && fallo.estado === 409) {
        setErrores({ numero_documento: 'Ya existe un cliente con este documento.' })
        requestAnimationFrame(() => formulario.elements.namedItem('numero_documento')?.focus())
      }
    } finally {
      enCurso.current = false
      setPendiente(false)
    }
    if (respuesta) onGuardado(direccion ? respuesta.direccion : respuesta.cliente)
  }

  return <Modal titulo={`${registro ? 'Editar' : direccion ? 'Nueva' : 'Nuevo'} ${direccion ? 'dirección' : 'cliente'}`}
    descripcion={direccion ? 'Registra los datos para facilitar la entrega.' : 'Indica al menos un documento o teléfono. Los campos con * son obligatorios.'}
    onCerrar={onCerrar} bloqueado={pendiente}>
    <form onSubmit={enviar} noValidate aria-busy={pendiente}>
      {error && <p role="alert" className="mb-5 rounded-xl bg-app-elevada p-4 text-sm text-app-error">{error}</p>}
      <fieldset disabled={pendiente} className="vz-client-form">
        {campos.map(campo => {
          const id = `${prefijo}-${campo.nombre}`
          const ayudaId = `${id}-ayuda`
          const errorId = `${id}-error`
          const comunes = { id, name: campo.nombre, required: campo.requerido, 'aria-invalid': Boolean(errores[campo.nombre]),
            'aria-describedby': [campo.ayuda ? ayudaId : '', errores[campo.nombre] ? errorId : ''].filter(Boolean).join(' ') || undefined }
          return <div key={campo.nombre} className={campo.tipo === 'checkbox' || (direccion && campo.nombre !== 'alias') ? 'sm:col-span-2' : ''}>
            {campo.tipo === 'checkbox' ? <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-app-borde bg-app-elevada p-4">
              <input {...comunes} type="checkbox" defaultChecked={registro?.[campo.nombre] ?? false} className="size-5 accent-amber-500"/>{campo.etiqueta}
            </label> : <>
              <label htmlFor={id} className="mb-2 block text-sm font-semibold">{campo.etiqueta}{campo.requerido ? ' *' : ''}</label>
              {campo.opciones ? <select {...comunes} defaultValue={registro?.[campo.nombre] ?? 'DNI'} className={claseCampo}>
                {campo.opciones.map(opcion => <option key={opcion} value={opcion}>{opcion}</option>)}
              </select> : <input {...comunes} type={campo.tipo ?? 'text'} autoComplete={campo.auto ?? 'off'} maxLength={campo.max}
                placeholder={campo.ejemplo} defaultValue={registro?.[campo.nombre] ?? ''} className={claseCampo}/>}
            </>}
            {campo.ayuda && <p id={ayudaId} className="mt-2 text-xs leading-relaxed text-app-secundario">{campo.ayuda}</p>}
            {errores[campo.nombre] && <p id={errorId} role="alert" className="mt-2 text-xs text-app-error">{errores[campo.nombre]}</p>}
          </div>
        })}
        <div className="flex flex-wrap justify-end gap-3 border-t border-app-borde pt-5 sm:col-span-2">
          <BotonBase onClick={onCerrar} className="border border-app-borde bg-app-superficie">Cancelar</BotonBase>
          <BotonSecundario type="submit" cargando={pendiente} textoCargando="Guardando…">Guardar {direccion ? 'dirección' : 'cliente'}</BotonSecundario>
        </div>
      </fieldset>
    </form>
  </Modal>
}
