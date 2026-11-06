import { sequelize } from '../config/database.js';
import { Rol, Usuario, CompraFactura, AuditLog, ConfiguracionGlobal } from '../models/index.js';
// Declaración administrativa: no inventar banco, comprobante ni caja de origen.
export function saldarComprasIniciales({ transaction: padre } = {}) {
  return sequelize.transaction(padre ? { transaction: padre } : {}, async transaction => {
    const rol = await Rol.findOne({ where: { nombre: 'administrador' }, transaction, lock: transaction.LOCK.UPDATE });
    const actores = rol ? await Usuario.findAll({ where: { rol_id: rol.id, estado: 'activo' }, attributes: ['id'], transaction }) : [];
    if (actores.length !== 1) throw Error('Se requiere un administrador activo único.');
    const lote = await ConfiguracionGlobal.findByPk('COMPRAS_ABASTECIMIENTO_INICIAL_V1', { transaction });
    if (lote?.valor_json?.documentos?.length !== 6) throw Error('No se encontró el lote inicial completo.');
    const compras = await CompraFactura.findAll({ where: { numero_factura: lote.valor_json.documentos }, transaction, lock: transaction.LOCK.UPDATE });
    if (compras.length !== 6 || compras.some(c => c.estado_registro !== 'confirmada' || !['pendiente', 'pagado_total'].includes(c.estado_pago))) throw Error('Compras incompletas o estado incompatible.');
    let actualizadas = 0;
    for (const c of compras) {
      if (c.estado_pago === 'pagado_total') continue;
      await c.update({ estado_pago: 'pagado_total' }, { transaction });
      await AuditLog.create({ usuario_id: actores[0].id, entidad_afectada: 'compras_facturas', entidad_id: c.id, tipo_evento: 'UPDATE', descripcion: 'Compra inicial saldada por instrucción del propietario. Sin caja, banco ni comprobante de desembolso especificados.', datos_anteriores: { estado_pago: 'pendiente' }, datos_nuevos: { estado_pago: 'pagado_total', importe_declarado: c.total, fecha_declarada: '2026-11-06', origen: 'declaracion_propietario', movimiento_caja_id: null } }, { transaction });
      actualizadas++;
    }
    return { actualizadas, compras: compras.length, estado_pago: 'pagado_total' };
  });
}
