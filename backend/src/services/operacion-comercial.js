import { createHash, randomUUID } from 'node:crypto';
import { Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Usuario, Rol, IdempotenciaOperacion, AuditLog, EventoOutbox } from '../models/index.js';
import { ErrorPedido, exigirPedido as exigir, idEntero } from './pedidos-calculo.js';

// Canonizar claves de objetos, preservando el orden de líneas/pagos.
function canonico(v) {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, canonico(v[k])]));
  return v;
}
export async function operacionComercial({ usuarioId, clave, tipo, cuerpo, transaction, seguridad = false }, ejecutar) {
  exigir(idEntero(usuarioId) && typeof clave === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(clave));
  const hash = createHash('sha256').update(JSON.stringify(canonico(cuerpo))).digest('hex');
  for (let intento = 0; ; intento++) {
    try {
      // Las pruebas pueden aportar una transacción padre; el savepoint mantiene
      // la atomicidad si falla una operación dentro de esa transacción.
      return await sequelize.transaction(transaction ? { transaction } : { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async tx => {
        // Las operaciones sensibles respetan la barrera de roles antes del actor,
        // igual que crear/consumir autorizaciones y gestionar empleados.
        if (seguridad) await Rol.findOne({ where: { nombre: 'administrador' }, transaction: tx, lock: tx.LOCK.UPDATE });
        const actor = await Usuario.findByPk(usuarioId, { transaction: tx, lock: tx.LOCK.UPDATE });
        exigir(actor?.estado === 'activo', 'USUARIO_NO_DISPONIBLE');
        const anterior = await IdempotenciaOperacion.findOne({ where: { usuario_id: usuarioId, tipo_operacion: tipo, clave }, transaction: tx, lock: tx.LOCK.UPDATE });
        if (anterior) {
          exigir(!anterior.respuesta_json?.cancelada, 'OPERACION_CANCELADA');
          exigir(anterior.request_hash === hash && anterior.estado === 'confirmada', 'IDEMPOTENCIA_EN_CONFLICTO');
          return { ...anterior.respuesta_json, repetida: true };
        }
        const registro = await IdempotenciaOperacion.create({ usuario_id: usuarioId, tipo_operacion: tipo, clave, request_hash: hash, estado: 'procesando' }, { transaction: tx });
        const resultado = await ejecutar(tx, randomUUID());
        await registro.update({ estado: 'confirmada', http_status: ['pedido.crear', 'pedido.cobrar', 'caja.abrir', 'caja.movimiento', 'venta.devolver'].includes(tipo) ? 201 : 200, respuesta_json: resultado }, { transaction: tx });
        return { ...resultado, repetida: false };
      });
    } catch (e) {
      if (!transaction && ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(e.original?.code) && intento < 2) continue;
      if (e.name === 'SequelizeUniqueConstraintError') throw new ErrorPedido('OPERACION_EN_CONFLICTO');
      throw e;
    }
  }
}
// Un resultado 404 de recuperación no demuestra que el POST no siga en vuelo.
// Cancelar usa la misma barrera por actor: espera al commit y recupera su
// resultado, o deja una lápida que impide ejecutar más tarde esa identidad.
export function resolverIntento(usuarioId, tipo, clave) {
  exigir(idEntero(usuarioId) && ['pedido.crear', 'pedido.bloquear_pago', 'pedido.liberar_pago', 'pedido.cobrar', 'caja.abrir', 'caja.movimiento', 'caja.cerrar', 'venta.devolver'].includes(tipo) &&
    typeof clave === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(clave));
  return sequelize.transaction(async tx => {
    const actor = await Usuario.findByPk(usuarioId, { transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(actor?.estado === 'activo', 'USUARIO_NO_DISPONIBLE');
    const anterior = await IdempotenciaOperacion.findOne({ where: { usuario_id: usuarioId, tipo_operacion: tipo, clave }, transaction: tx, lock: tx.LOCK.UPDATE });
    if (anterior) {
      exigir(anterior.estado === 'confirmada', 'OPERACION_EN_CONFLICTO');
      return { ...anterior.respuesta_json, repetida: true };
    }
    await IdempotenciaOperacion.create({ usuario_id: usuarioId, tipo_operacion: tipo, clave,
      request_hash: '0'.repeat(64), estado: 'confirmada', http_status: 409, respuesta_json: { cancelada: true } }, { transaction: tx });
    return { cancelada: true };
  });
}
// Recuperar exclusivamente una operación propia ante pérdida de la respuesta.
export async function recuperarOperacion(usuarioId, tipo, clave) {
  exigir(idEntero(usuarioId) && ['pedido.crear', 'pedido.ampliar', 'pedido.bloquear_pago', 'pedido.liberar_pago', 'pedido.cobrar', 'caja.abrir', 'caja.movimiento', 'caja.cerrar', 'venta.devolver'].includes(tipo) &&
    typeof clave === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(clave));
  const registro = await IdempotenciaOperacion.findOne({ where: { usuario_id: usuarioId, tipo_operacion: tipo, clave, estado: 'confirmada' } });
  exigir(registro, 'OPERACION_INEXISTENTE');
  return { ...registro.respuesta_json, repetida: true };
}
export const auditoriaComercial = (usuarioId, entidad, id, datos, tx) => AuditLog.create({ usuario_id: usuarioId,
  entidad_afectada: entidad, entidad_id: id, tipo_evento: 'UPDATE', datos_nuevos: datos, descripcion: 'Operación comercial transaccional, fase 28.' }, { transaction: tx });
export const eventoComercial = (tipo, entidad, id, version, payload, tx) => EventoOutbox.create({ event_uid: randomUUID(), tipo, entidad,
  entidad_id: id, version, sala_destino: tipo === 'pedido.cocina' ? 'kds' : tipo.startsWith('impresion.') ? 'impresion' : tipo.startsWith('pedido') ? 'pedidos' : 'caja', payload_json: payload }, { transaction: tx });
