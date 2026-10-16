import { useRef, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import BotonPeligro from '../ui/BotonPeligro.jsx'
import BotonSecundario from '../ui/BotonSecundario.jsx'
import {
  eliminarProducto, eliminarCategoria, editarProducto, editarCategoria
} from '../../services/catalogo.service.js'
import { ErrorApi } from '../../services/api.js'
import { useAuthStore } from '../../stores/auth.store.js'

function ConfirmarAccionCatalogo({ registro, onCerrar, onCompletado }) {
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState('')
  const [tieneRelaciones, setTieneRelaciones] = useState(false)
  const enCurso = useRef(false)
  const comprobarSesion = useAuthStore(state => state.comprobarSesion)
  const esCategoria = registro.tipo === 'categoria'
  const eliminar = registro.accion === 'eliminar'
  const verbo = eliminar ? 'Eliminar definitivamente' : registro.accion === 'activar' ? 'Activar' : 'Desactivar'

  async function ejecutar(accion) {
    if (enCurso.current) return
    enCurso.current = true
    setPendiente(true)
    setError('')
    let completado = false
    try {
      if (accion === 'eliminar') {
        await (esCategoria ? eliminarCategoria : eliminarProducto)(registro.id)
      } else {
        // Desactivar conserva el registro y todas sus relaciones.
        await (esCategoria ? editarCategoria : editarProducto)(registro.id,
          esCategoria ? { activa: accion === 'activar' } : { estado: accion === 'activar' ? 'activo' : 'inactivo' })
      }
      completado = true
    } catch (errorOperacion) {
      if (errorOperacion instanceof ErrorApi && errorOperacion.estado === 401) {
        await comprobarSesion()
        return
      }
      if (accion === 'eliminar' && errorOperacion instanceof ErrorApi && errorOperacion.estado === 409) {
        setTieneRelaciones(true)
      }
      setError(errorOperacion instanceof ErrorApi
        ? errorOperacion.message : 'No se pudo completar la operación.')
    } finally {
      enCurso.current = false
      setPendiente(false)
    }
    if (completado) onCompletado({ ...registro, accion })
  }

  return (
    <Modal titulo={`${verbo} ${esCategoria ? 'categoría' : 'producto'}`} onCerrar={onCerrar} bloqueado={pendiente}>
      <p className="break-words font-semibold">{registro.nombre}</p>
      <p className="mt-3 text-sm leading-6 text-app-secundario">
        {eliminar
          ? 'Esta acción es definitiva. Solo se eliminará si no tiene registros asociados. Si existen relaciones, el borrado se bloqueará y se conservarán todos los datos.'
          : registro.accion === 'activar'
            ? 'El registro volverá a estar habilitado si cumple las condiciones del catálogo.'
            : 'El registro quedará inactivo. Se conservarán sus datos y todos sus registros asociados.'}
      </p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-app-elevada p-4 text-sm text-app-error">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <BotonBase disabled={pendiente} onClick={onCerrar}
          className="border border-app-borde bg-app-superficie text-app-texto enabled:hover:bg-app-hover">
          Cancelar
        </BotonBase>
        {tieneRelaciones && registro.activo && (
          <BotonSecundario cargando={pendiente} textoCargando="Guardando…" onClick={() => void ejecutar('desactivar')}>
            Desactivar en su lugar
          </BotonSecundario>
        )}
        {eliminar ? (
          <BotonPeligro disabled={tieneRelaciones} cargando={pendiente} textoCargando="Eliminando…" onClick={() => void ejecutar('eliminar')}>
            Eliminar definitivamente
          </BotonPeligro>
        ) : (
          <BotonSecundario cargando={pendiente} textoCargando="Guardando…" onClick={() => void ejecutar(registro.accion)}>
            {verbo}
          </BotonSecundario>
        )}
      </div>
    </Modal>
  )
}

export default ConfirmarAccionCatalogo
