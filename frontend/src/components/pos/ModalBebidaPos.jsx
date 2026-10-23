import { useMemo, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import BotonBase from '../ui/BotonBase.jsx'
import ModalPersonalizarProducto from './ModalPersonalizarProducto.jsx'
import useConsultaRemota from '../../hooks/useConsultaRemota.js'
import { consultarCatalogoPos } from '../../services/pos.service.js'
import { obtenerFamiliaBebida, obtenerPresentacionesBebida } from '../../utils/bebidas-pos.js'

async function cargarPresentaciones({ categoriaId, clave }, signal) {
  // Consultar la categoría sin búsqueda recupera todos los tamaños, incluso
  // cuando el cajero llegó buscando un SKU o un volumen específico.
  const respuesta = await consultarCatalogoPos({ categoriaId, signal })
  return obtenerPresentacionesBebida(respuesta.productos, clave)
}

export default function ModalBebidaPos({ producto, seleccionInicial = null, onConfirmar, onCerrar, deshabilitado = false }) {
  const familia = obtenerFamiliaBebida(producto)
  const clave = familia?.clave
  const solicitud = useMemo(() => clave ? { clave, categoriaId: producto.categoria_id } : null,
    [clave, producto.categoria_id])
  const [elegidoId, setElegidoId] = useState(seleccionInicial?.productoId ?? producto.productoPreferidoId ?? producto.id)
  const { datos, pendiente, error, reintentar } = useConsultaRemota(cargarPresentaciones, solicitud)
  const elegido = datos?.find(p => p.id === elegidoId) ?? datos?.[0]

  if (!elegido) return (
    <Modal titulo={`Presentaciones de ${familia?.nombre ?? 'bebida'}`} onCerrar={onCerrar}>
      {pendiente ? <p role="status">Consultando presentaciones disponibles…</p> : (
        <div className="space-y-4">
          <p role="alert">{error || 'Esta bebida no tiene presentaciones disponibles.'}</p>
          <BotonBase onClick={reintentar}>Reintentar presentaciones</BotonBase>
        </div>
      )}
    </Modal>
  )

  return (
    <ModalPersonalizarProducto
      producto={elegido} nombreGrupo={familia.nombre} presentaciones={datos}
      onCambiarPresentacion={setElegidoId} seleccionInicial={seleccionInicial}
      deshabilitado={deshabilitado} onCerrar={onCerrar}
      onConfirmar={seleccion => {
        if (seleccion.productoId !== elegido.id || obtenerFamiliaBebida(elegido)?.clave !== clave) {
          throw new Error('La presentación ya no corresponde a esta bebida.')
        }
        onConfirmar(seleccion, elegido)
      }}
    />
  )
}
