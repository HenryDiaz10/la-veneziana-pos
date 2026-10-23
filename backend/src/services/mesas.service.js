import { Transaction, Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { MesaSalon, PedidoMaster, AuditLog } from '../models/index.js';
import { operacionComercial, auditoriaComercial, eventoComercial } from './operacion-comercial.js';
import { exigirPedido as exigir } from './pedidos-calculo.js';
import { CUENTAS_ACTIVAS, idMesa, revisionMesa, transicionMesa, validarComandoMesa } from './mesas-reglas.js';

export const CAMPOS_MESA = ['id', 'zona_id', 'codigo_mesa', 'capacidad_sillas', 'estado_actual', 'mesero_asignado_id', 'posicion_x', 'posicion_y'];
export const CAMPOS_CUENTA_MESA = ['id', 'mesa_id', 'codigo_pedido', 'estado_cuenta', 'version'];
// No bloquear pedido después de mesa: el cobro toma pedido antes que mesa.
// La propia mesa es la barrera para crear cuentas y cambiar su disponibilidad.
export const cuentaActivaMesa = (id, tx) => PedidoMaster.findOne({ where: { mesa_id: id, estado_cuenta: CUENTAS_ACTIVAS }, attributes: CAMPOS_CUENTA_MESA, transaction: tx, raw: true });
export const marcaMesa = async (id, tx) => (await AuditLog.findOne({ where: { entidad_afectada: 'mesas_salon', entidad_id: id }, attributes: ['id'], order: [['id', 'DESC']], transaction: tx, raw: true }))?.id ?? null;
export function presentarMesa(mesa, pedido, marca) {
  const m = Object.fromEntries(CAMPOS_MESA.map(c => [c, mesa[c]]));
  return { ...m, revision: revisionMesa(m, pedido, marca), pedido_abierto: pedido ? { id: String(pedido.id), codigo_pedido: pedido.codigo_pedido, estado_cuenta: pedido.estado_cuenta, version: pedido.version } : null };
}
const bloquearMesa = async (id, tx) => {
  const mesa = await MesaSalon.findByPk(idMesa(id), { transaction: tx, lock: tx.LOCK.UPDATE });
  exigir(mesa, 'MESA_INEXISTENTE');
  return mesa;
};
// Todos los cambios operativos generan auditoría y evento en la misma transacción.
async function guardarCambio(mesa, cambios, usuarioId, accion, motivo, tx) {
  const antes = { estado_actual: mesa.estado_actual, mesero_asignado_id: mesa.mesero_asignado_id };
  await mesa.update(cambios, { transaction: tx });
  const audit = await auditoriaComercial(usuarioId, 'mesas_salon', mesa.id, { ...cambios, accion, motivo, antes }, tx);
  await eventoComercial(`mesa.${accion}`, 'mesas_salon', mesa.id, 1, { version_esquema: 1, mesa_id: mesa.id, ...cambios, cambio_id: String(audit.id) }, tx);
}
export function consultarMesaSalon(id) {
  id = idMesa(id);
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async tx => {
    const mesa = await MesaSalon.findByPk(id, { attributes: CAMPOS_MESA, transaction: tx, raw: true });
    exigir(mesa, 'MESA_INEXISTENTE');
    return { mesa: presentarMesa(mesa, await cuentaActivaMesa(id, tx), await marcaMesa(id, tx)) };
  });
}
export function mesasDisponiblesPedido(usuarioId) {
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async tx => {
    const mesas = await MesaSalon.findAll({ where: { [Op.or]: [{ estado_actual: 'libre' }, { estado_actual: 'ocupada', mesero_asignado_id: usuarioId }] }, attributes: ['id', 'codigo_mesa'], order: [['codigo_mesa', 'ASC']], transaction: tx, raw: true });
    const cuentas = mesas.length ? await PedidoMaster.findAll({ where: { mesa_id: mesas.map(m => m.id), estado_cuenta: CUENTAS_ACTIVAS }, attributes: ['mesa_id'], transaction: tx, raw: true }) : [];
    const ocupadas = new Set(cuentas.map(p => p.mesa_id));
    return mesas.filter(m => !ocupadas.has(m.id));
  });
}
export function cambiarMesa(id, accion, datos, contexto) {
  id = idMesa(id);
  const comando = validarComandoMesa(accion, datos);
  return operacionComercial({ ...contexto, tipo: `mesa.${accion}`, cuerpo: { id, ...comando } }, async tx => {
    const mesa = await bloquearMesa(id, tx), pedido = await cuentaActivaMesa(id, tx);
    exigir(revisionMesa(mesa, pedido, await marcaMesa(id, tx)) === comando.revision, 'MESA_DESACTUALIZADA');
    const cambios = transicionMesa(accion, mesa, pedido, contexto.usuarioId);
    await guardarCambio(mesa, cambios, contexto.usuarioId, accion, comando.motivo, tx);
    return { mesa: presentarMesa(mesa, null, await marcaMesa(id, tx)) };
  });
}

// Confirmar un pedido ocupa y asigna una mesa libre, o usa una ocupada por el
// mismo responsable antes de pedir. Nunca crea otra cuenta sobre una ya abierta.
export async function tomarMesaParaPedido(id, usuarioId, tx) {
  const mesa = await bloquearMesa(id, tx);
  exigir(!await cuentaActivaMesa(mesa.id, tx), 'MESA_CON_CUENTA_ACTIVA');
  exigir(mesa.estado_actual === 'libre' || (mesa.estado_actual === 'ocupada' && mesa.mesero_asignado_id === usuarioId), 'MESA_NO_DISPONIBLE');
  await guardarCambio(mesa, { estado_actual: 'ocupada', mesero_asignado_id: usuarioId }, usuarioId, 'pedido_registrado', 'Asignación al confirmar pedido de salón.', tx);
}
export async function comprobarMesaAmpliacion(pedido, usuarioId, tx) {
  if (!pedido.mesa_id) return;
  const mesa = await bloquearMesa(pedido.mesa_id, tx);
  exigir(mesa.estado_actual === 'ocupada' && mesa.mesero_asignado_id === usuarioId, 'MESA_NO_ASIGNADA');
}
export async function finalizarMesaTrasCobro(pedido, usuarioId, tx) {
  if (!pedido.mesa_id) return;
  const mesa = await bloquearMesa(pedido.mesa_id, tx);
  exigir(mesa.estado_actual === 'ocupada' && !await cuentaActivaMesa(mesa.id, tx), 'MESA_INCONSISTENTE');
  // Mantener responsable hasta la limpieza, también para pedidos previos a F34.
  await guardarCambio(mesa, { estado_actual: 'sucia_por_limpiar', mesero_asignado_id: mesa.mesero_asignado_id ?? pedido.usuario_creador_id }, usuarioId, 'cobrada', 'Cuenta pagada; requiere limpieza.', tx);
}
