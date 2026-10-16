import { Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { InsumoAlmacen, UnidadMedida, KdsTarea, ReservaInsumo, InventarioKardex } from '../models/index.js';
import { ErrorInventario, exigirInventario as exigir, decimalInventario as decimal, formatoInventario as formato,
  promedioIngreso, costoTotalConsumo, comprobarSaldos, idInsumoValido, idTareaInventario, ingredientesTarea } from './inventario-calculo.js';

export { ErrorInventario } from './inventario-calculo.js';

// Servicios internos: los futuros orquestadores de pedidos/KDS/compras deben
// autenticar, autorizar y ejecutar su cambio de negocio en ESTA transacción.
// No convertir errores en respuestas de éxito dentro de una transacción ajena.
async function ejecutar(operacion, transaction) {
  if (transaction) {
    exigir(transaction.sequelize === sequelize && !transaction.finished, 'TRANSACCION_INVALIDA');
    return operacion(transaction);
  }
  for (let intento = 0; ; intento++) {
    try {
      return await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, operacion);
    } catch (error) {
      // Reintentar solo la transacción completa, nunca un fragmento de ella.
      if (error.original?.code === 'ER_LOCK_DEADLOCK' && intento < 2) continue;
      if (error.name === 'SequelizeUniqueConstraintError') throw new ErrorInventario('OPERACION_EN_CONFLICTO');
      throw error;
    }
  }
}
const ordenIds = (a, b) => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
async function bloquearTareas(ids, tx) {
  exigir(Array.isArray(ids) && ids.length > 0 && ids.length <= 100, 'DATOS_INVALIDOS');
  const canonicos = ids.map(idTareaInventario).sort(ordenIds);
  exigir(new Set(canonicos).size === canonicos.length, 'DATOS_INVALIDOS');
  const tareas = [];
  for (const id of canonicos) {
    const tarea = await KdsTarea.findByPk(id, { transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(tarea, 'TAREA_INEXISTENTE');
    tareas.push(tarea);
  }
  return tareas;
}
async function bloquearInsumos(ids, tx) {
  const mapa = new Map();
  // Bloqueos explícitos por PK: orden estable aun con distintos planes SQL.
  for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
    const insumo = await InsumoAlmacen.findByPk(id, { transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(insumo, 'INSUMO_INEXISTENTE', { insumo_id: id });
    comprobarSaldos(decimal(insumo.stock_fisico), decimal(insumo.stock_reservado));
    mapa.set(id, insumo);
  }
  return mapa;
}
async function reservasTarea(id, tx) {
  return ReservaInsumo.findAll({ where: { tarea_id: id }, order: [['insumo_id', 'ASC']], transaction: tx, lock: tx.LOCK.UPDATE });
}
async function comprobarUnidad(insumo, tx, ingrediente) {
  const unidad = await UnidadMedida.findByPk(insumo.unidad_medida_id, { transaction: tx, lock: tx.LOCK.SHARE });
  const base = unidad?.abreviatura?.toLowerCase();
  exigir(['kg', 'l', 'un'].includes(base) && (!ingrediente ||
    (insumo.unidad_medida_id === ingrediente.unidad_medida_id && base === ingrediente.unidad)), 'UNIDAD_CAMBIADA');
}
const saldo = i => ({ insumo_id: i.id, stock_fisico: i.stock_fisico, stock_reservado: i.stock_reservado,
  disponible: formato(decimal(i.stock_fisico) - decimal(i.stock_reservado)), costo_promedio: i.costo_promedio });
const filasPublicas = filas => filas.map(f => ({ id: String(f.id), tarea_id: String(f.tarea_id), insumo_id: f.insumo_id,
  cantidad_base: f.cantidad_base, estado: f.estado, kardex_id: f.kardex_id === null ? null : String(f.kardex_id),
  costo_unitario_snapshot: f.costo_unitario_snapshot, costo_total_snapshot: f.costo_total_snapshot }));
async function guardarSaldo(i, fisico, reservado, tx, costos = {}) {
  comprobarSaldos(fisico, reservado);
  await i.update({ stock_fisico: formato(fisico), stock_reservado: formato(reservado), ...costos }, { transaction: tx });
}
function mismaReceta(reservas, ingredientes) {
  exigir(reservas.length === ingredientes.length && ingredientes.every(i => reservas.some(r =>
    r.insumo_id === i.insumo_id && decimal(r.cantidad_base) === i.cantidad)), 'RESERVA_INCONSISTENTE');
}

// Confirmar todas las tareas/componentes del pedido en una sola llamada/tx.
// Si falta un insumo, no se publica ninguna reserva del lote.
export function reservarTareas(tareaIds, { transaction } = {}) {
  return ejecutar(async tx => {
    const tareas = await bloquearTareas(tareaIds, tx);
    const recetas = tareas.map(t => ingredientesTarea(t));
    const insumos = await bloquearInsumos(recetas.flat().map(i => i.insumo_id), tx);
    const nuevas = [], existentes = [], totales = new Map();
    for (let n = 0; n < tareas.length; n++) {
      const t = tareas[n], ingredientes = recetas[n], reservas = await reservasTarea(t.id, tx);
      if (reservas.length) {
        mismaReceta(reservas, ingredientes);
        exigir(reservas.every(r => r.estado === 'reservada') || reservas.every(r => r.estado === 'consumida'), 'RESERVA_FINALIZADA');
        existentes.push(...reservas);
        continue;
      }
      exigir(t.estado === 'espera' && t.iniciado_en === null, 'TAREA_NO_RESERVABLE');
      for (const i of ingredientes) {
        const insumo = insumos.get(i.insumo_id);
        exigir(insumo.activo === true && !insumo.quiebre_declarado, 'INSUMO_NO_DISPONIBLE', { insumo_id: insumo.id });
        await comprobarUnidad(insumo, tx, i);
        totales.set(insumo.id, (totales.get(insumo.id) ?? 0n) + i.cantidad);
        nuevas.push({ tarea_id: t.id, insumo_id: insumo.id, cantidad_base: formato(i.cantidad), estado: 'reservada' });
      }
    }
    const faltantes = [...totales].filter(([id, cantidad]) => cantidad > decimal(insumos.get(id).stock_fisico) - decimal(insumos.get(id).stock_reservado))
      .map(([id, cantidad]) => ({ insumo_id: id, requerida: formato(cantidad), disponible: saldo(insumos.get(id)).disponible }));
    exigir(!faltantes.length, 'STOCK_INSUFICIENTE', faltantes);
    for (const [id, cantidad] of totales) {
      const i = insumos.get(id);
      await guardarSaldo(i, decimal(i.stock_fisico), decimal(i.stock_reservado) + cantidad, tx);
    }
    const creadas = [];
    for (const valores of nuevas) creadas.push(await ReservaInsumo.create(valores, { transaction: tx }));
    return { estado: 'reservado', repetida: !nuevas.length, reservas: filasPublicas([...existentes, ...creadas]), saldos: [...insumos.values()].map(saldo) };
  }, transaction);
}

// Se llama al iniciar preparación o despachar una bebida, no al cobrar.
// El estado KDS/historial/outbox se cambiará en el mismo tx por su orquestador.
export function consumirTarea(tareaId, { usuarioId, transaction } = {}) {
  exigir(idInsumoValido(usuarioId), 'DATOS_INVALIDOS');
  return ejecutar(async tx => {
    const [tarea] = await bloquearTareas([tareaId], tx);
    const ingredientes = ingredientesTarea(tarea);
    const insumos = await bloquearInsumos(ingredientes.map(i => i.insumo_id), tx);
    const reservas = await reservasTarea(tarea.id, tx);
    mismaReceta(reservas, ingredientes);
    if (reservas.every(r => r.estado === 'consumida')) return { estado: 'consumido', repetida: true, reservas: filasPublicas(reservas), saldos: [...insumos.values()].map(saldo) };
    exigir(['espera', 'preparando'].includes(tarea.estado), 'TAREA_NO_CONSUMIBLE');
    exigir(reservas.every(r => r.estado === 'reservada'), 'RESERVA_FINALIZADA');
    for (const ingrediente of ingredientes) await comprobarUnidad(insumos.get(ingrediente.insumo_id), tx, ingrediente);
    for (const r of reservas) {
      const i = insumos.get(r.insumo_id), cantidad = decimal(r.cantidad_base, { positivo: true });
      const fisico = decimal(i.stock_fisico), reservado = decimal(i.stock_reservado), costo = decimal(i.costo_promedio);
      exigir(reservado >= cantidad && fisico >= cantidad, 'SALDOS_INCONSISTENTES');
      const total = costoTotalConsumo(cantidad, costo);
      await guardarSaldo(i, fisico - cantidad, reservado - cantidad, tx);
      const movimiento = await InventarioKardex.create({ insumo_id: i.id, tipo_transaccion: 'SALIDA_VENTA',
        cantidad: formato(cantidad), saldo_posterior: i.stock_fisico, costo_unitario_transaccion: formato(costo),
        usuario_id: usuarioId, referencia_documento: `tarea:${tarea.id}`, operacion_uid: `tarea:${tarea.id}:insumo:${i.id}` }, { transaction: tx });
      await r.update({ estado: 'consumida', costo_unitario_snapshot: formato(costo), costo_total_snapshot: formato(total),
        kardex_id: movimiento.id, consumido_en: new Date() }, { transaction: tx });
    }
    return { estado: 'consumido', repetida: false, reservas: filasPublicas(reservas), saldos: [...insumos.values()].map(saldo) };
  }, transaction);
}

export function liberarTarea(tareaId, { transaction } = {}) {
  return ejecutar(async tx => {
    const [tarea] = await bloquearTareas([tareaId], tx);
    const ingredientes = ingredientesTarea(tarea);
    const insumos = await bloquearInsumos(ingredientes.map(i => i.insumo_id), tx);
    const reservas = await reservasTarea(tarea.id, tx);
    mismaReceta(reservas, ingredientes);
    if (reservas.every(r => r.estado === 'liberada')) return { estado: 'liberado', repetida: true, reservas: filasPublicas(reservas), saldos: [...insumos.values()].map(saldo) };
    exigir(['espera', 'cancelado'].includes(tarea.estado) && tarea.iniciado_en === null, 'TAREA_YA_INICIADA');
    exigir(reservas.every(r => r.estado === 'reservada'), 'RESERVA_FINALIZADA');
    for (const r of reservas) {
      const i = insumos.get(r.insumo_id), cantidad = decimal(r.cantidad_base, { positivo: true });
      exigir(decimal(i.stock_reservado) >= cantidad, 'SALDOS_INCONSISTENTES');
      await guardarSaldo(i, decimal(i.stock_fisico), decimal(i.stock_reservado) - cantidad, tx);
      await r.update({ estado: 'liberada' }, { transaction: tx });
    }
    return { estado: 'liberado', repetida: false, reservas: filasPublicas(reservas), saldos: [...insumos.values()].map(saldo) };
  }, transaction);
}

const TIPOS = ['INGRESO_COMPRA', 'INGRESO_AJUSTE', 'SALIDA_VENTA', 'SALIDA_MERMA', 'SALIDA_AJUSTE'];
// Primitiva interna para compras/ajustes autorizados. Nunca montar como CRUD de
// saldos: el documento, permiso, motivo y autorización se resuelven en el caller.
export function registrarMovimiento(datos, { transaction } = {}) {
  exigir(datos && typeof datos === 'object' && !Array.isArray(datos) &&
    Object.keys(datos).every(k => ['insumo_id', 'tipo_transaccion', 'cantidad', 'costo_unitario', 'operacion_uid', 'usuario_id', 'referencia_documento', 'notas'].includes(k)), 'DATOS_INVALIDOS');
  const { insumo_id: id, tipo_transaccion: tipo, usuario_id: actor, operacion_uid: uid } = datos;
  exigir(idInsumoValido(id) && idInsumoValido(actor) && TIPOS.includes(tipo) &&
    typeof uid === 'string' && /^mov:[a-z0-9][a-z0-9:_-]{0,59}$/.test(uid), 'DATOS_INVALIDOS');
  const cantidad = decimal(datos.cantidad, { positivo: true }), ingreso = tipo.startsWith('INGRESO_');
  const costoEntrada = ingreso ? decimal(datos.costo_unitario) : null;
  exigir(ingreso || datos.costo_unitario === undefined, 'DATOS_INVALIDOS');
  const referencia = datos.referencia_documento ?? null, notas = datos.notas ?? null;
  exigir([ [referencia, 100], [notas, 255] ].every(([v, max]) => v === null ||
    (typeof v === 'string' && [...v].length <= max && !/[\u0000-\u001f\u007f]/.test(v))), 'DATOS_INVALIDOS');
  return ejecutar(async tx => {
    const i = (await bloquearInsumos([id], tx)).get(id);
    const anterior = await InventarioKardex.findOne({ where: { operacion_uid: uid }, transaction: tx, lock: tx.LOCK.UPDATE });
    if (anterior) {
      exigir(anterior.insumo_id === id && anterior.tipo_transaccion === tipo && anterior.usuario_id === actor &&
        decimal(anterior.cantidad) === cantidad && (!ingreso || decimal(anterior.costo_unitario_transaccion) === costoEntrada) &&
        anterior.referencia_documento === referencia && anterior.notas === notas, 'OPERACION_EN_CONFLICTO');
      return { estado: 'registrado', repetida: true, movimiento: anterior.toJSON(), saldo: saldo(i) };
    }
    await comprobarUnidad(i, tx);
    const fisico = decimal(i.stock_fisico), reservado = decimal(i.stock_reservado), promedio = decimal(i.costo_promedio);
    exigir(ingreso || cantidad <= fisico - reservado, 'STOCK_INSUFICIENTE', { insumo_id: id, disponible: saldo(i).disponible });
    const nuevo = ingreso ? fisico + cantidad : fisico - cantidad;
    const costos = ingreso ? { costo_promedio: formato(promedioIngreso(fisico, promedio, cantidad, costoEntrada)), ultimo_costo: formato(costoEntrada) } : {};
    await guardarSaldo(i, nuevo, reservado, tx, costos);
    const movimiento = await InventarioKardex.create({ insumo_id: id, tipo_transaccion: tipo, cantidad: formato(cantidad),
      saldo_posterior: i.stock_fisico, costo_unitario_transaccion: formato(ingreso ? costoEntrada : promedio),
      usuario_id: actor, operacion_uid: uid, referencia_documento: referencia, notas }, { transaction: tx });
    return { estado: 'registrado', repetida: false, movimiento: movimiento.toJSON(), saldo: saldo(i) };
  }, transaction);
}
