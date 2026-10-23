import { createHash } from 'node:crypto';
import { campos, exigirPedido as exigir, idEntero, texto } from './pedidos-calculo.js';

export const CUENTAS_ACTIVAS = Object.freeze(['abierta', 'bloqueada_en_pago']);
export function idMesa(valor) {
  exigir((typeof valor === 'number' || (typeof valor === 'string' && /^[1-9]\d{0,9}$/.test(valor))) && idEntero(Number(valor)));
  return Number(valor);
}
export function validarComandoMesa(accion, datos) {
  exigir(['ocupar', 'liberar', 'limpiar'].includes(accion));
  campos(datos, ['revision', 'motivo']);
  exigir(typeof datos.revision === 'string' && /^[a-f0-9]{64}$/.test(datos.revision));
  const motivo = texto(datos.motivo, 250);
  exigir(accion !== 'liberar' || motivo.length >= 3);
  return { revision: datos.revision, motivo };
}
// El ID de auditoría distingue dos ciclos aunque la mesa vuelva al mismo estado.
export function revisionMesa(mesa, pedido = null, marca = null) {
  return createHash('sha256').update(JSON.stringify([mesa.id, mesa.zona_id, mesa.codigo_mesa,
    mesa.capacidad_sillas, mesa.estado_actual, mesa.mesero_asignado_id, mesa.posicion_x, mesa.posicion_y,
    marca === null ? null : String(marca), pedido ? [String(pedido.id), pedido.version, pedido.estado_cuenta] : null])).digest('hex');
}
export function transicionMesa(accion, mesa, pedidoActivo, usuarioId) {
  exigir(!pedidoActivo, 'MESA_CON_CUENTA_ACTIVA');
  const origen = { ocupar: 'libre', liberar: 'ocupada', limpiar: 'sucia_por_limpiar' }[accion];
  exigir(origen && mesa.estado_actual === origen, 'TRANSICION_MESA_NO_VALIDA');
  return { estado_actual: accion === 'ocupar' ? 'ocupada' : accion === 'liberar' ? 'sucia_por_limpiar' : 'libre',
    mesero_asignado_id: accion === 'ocupar' ? usuarioId : accion === 'limpiar' ? null : mesa.mesero_asignado_id };
}
