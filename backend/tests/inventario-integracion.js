// Prueba explícita de MySQL local. Solo crea y retira sus propios fixtures.
// No imprime configuración, SQL, cuentas reales ni credenciales.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Usuario, Rol, CategoriaVenta, ProductoVenta, InsumoAlmacen, UnidadMedida,
  PedidoMaster, PedidoItemKds, KdsTarea, ReservaInsumo, InventarioKardex, RecetaBom } from '../src/models/index.js';
import { registrarMovimiento, reservarTareas, consumirTarea, liberarTarea } from '../src/services/inventario.service.js';
import { decimalInventario, formatoInventario } from '../src/services/inventario-calculo.js';
import { resolverReceta } from '../src/services/recetas.service.js';

assert.notEqual(env.entorno, 'production', 'Estas pruebas no se ejecutan en producción.');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(env.database.host), 'Se exige MySQL local.');
const marca = randomUUID(), registros = { insumos: [], tareas: [], items: [] };
let usuario, categoria, unidad, producto, pedido;
const nombreHook = `fallo-f23-${marca}`;
const errorEs = codigo => error => error?.codigo === codigo;
const leer = async i => { await i.reload(); return [i.stock_fisico, i.stock_reservado, i.costo_promedio, i.ultimo_costo]; };
const uid = sufijo => `mov:f23:${marca}:${sufijo}`;
async function crearInsumo(nombre) {
  const i = await InsumoAlmacen.create({ nombre: `F23 ${nombre} ${marca.slice(0,8)}`, codigo: `f23-${registros.insumos.length}-${marca}`, unidad_medida_id: unidad.id });
  registros.insumos.push(i); return i;
}
async function tarea(ingredientes, cantidad = 1, transaction) {
  const item = await PedidoItemKds.create({ pedido_id: pedido.id, producto_venta_id: producto.id,
    cantidad, precio_unitario_grabado: '1.00', subtotal_item: String(cantidad), snapshot_item_json: { fixture: marca } }, { transaction });
  registros.items.push(item);
  const t = await KdsTarea.create({ pedido_item_id: item.id, producto_id: producto.id, cantidad,
    snapshot_json: { version: 1, producto_venta_id: producto.id, variante_id: null, cantidad,
      ingredientes: ingredientes.map(([i, unitario]) => ({ insumo_id: i.id, unidad_medida_id: unidad.id, unidad: 'kg',
        cantidad_bruta_unitaria: unitario, cantidad_bruta_total: formatoInventario(decimalInventario(unitario) * BigInt(cantidad)) })) } }, { transaction });
  registros.tareas.push(t); return t;
}
async function nuevaTarea(i, cantidad = '1') { return tarea([[i, `${cantidad}.0000`]]); }
function ingreso(i, cantidad, costo, key, tipo = 'INGRESO_COMPRA') {
  return registrarMovimiento({ insumo_id: i.id, tipo_transaccion: tipo, cantidad, costo_unitario: costo,
    operacion_uid: uid(key), usuario_id: usuario.id, referencia_documento: `fixture:${marca}`, notas: 'Prueba temporal fase 23' });
}

try {
  await sequelize.authenticate();
  const rol = await Rol.findOne({ where: { nombre: 'administrador' } });
  assert.ok(rol);
  usuario = await Usuario.create({ nombre_completo: 'Prueba temporal inventario', email: `f23-${marca}@example.invalid`,
    password_hash: 'fixture-sin-acceso-interactivo', rol_id: rol.id, estado: 'activo' });
  categoria = await CategoriaVenta.create({ nombre: `Prueba F23 ${marca.slice(0,8)}`, slug: `f23-${marca}` });
  unidad = await UnidadMedida.create({ nombre: `F23 kg ${marca}`, abreviatura: 'kg' });
  producto = await ProductoVenta.create({ nombre: `Prueba inventario ${marca.slice(0,8)}`, categoria_id: categoria.id, precio_venta_base: '1.00' });
  pedido = await PedidoMaster.create({ codigo_pedido: `F23-${marca.slice(0,12)}`, tipo_atencion: 'llevar', usuario_creador_id: usuario.id });
  const i = await crearInsumo('última porción');
  await ingreso(i, '1', '10', 'inicio');
  const a = await nuevaTarea(i), b = await nuevaTarea(i);
  const carrera = await Promise.allSettled([reservarTareas([a.id]), reservarTareas([b.id])]);
  assert.equal(carrera.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(carrera.find(r => r.status === 'rejected').reason.codigo, 'STOCK_INSUFICIENTE');
  const ganadora = carrera[0].status === 'fulfilled' ? a : b;
  assert.deepEqual((await leer(i)).slice(0, 2), ['1.0000', '1.0000']);
  assert.equal((await reservarTareas([ganadora.id])).repetida, true);
  const consumos = await Promise.all([consumirTarea(ganadora.id, { usuarioId: usuario.id }), consumirTarea(ganadora.id, { usuarioId: usuario.id })]);
  assert.equal(consumos.filter(r => !r.repetida).length, 1);
  assert.deepEqual((await leer(i)).slice(0, 2), ['0.0000', '0.0000']);
  assert.equal(await InventarioKardex.count({ where: { insumo_id: i.id, tipo_transaccion: 'SALIDA_VENTA' } }), 1);
  const congelada = await ReservaInsumo.findOne({ where: { tarea_id: ganadora.id } });
  assert.equal(congelada.costo_unitario_snapshot, '10.0000');
  assert.equal(congelada.costo_total_snapshot, '10.0000');
  await assert.rejects(liberarTarea(ganadora.id), errorEs('RESERVA_FINALIZADA'));
  console.log('OK: última porción concurrente, preparación repetida sin doble salida y costo congelado.');

  await ingreso(i, '1', '20', 'reponer');
  await congelada.reload(); assert.equal(congelada.costo_total_snapshot, '10.0000');
  const cancelar = await nuevaTarea(i);
  await reservarTareas([cancelar.id]);
  const movimientosAntes = await InventarioKardex.count({ where: { insumo_id: i.id } });
  await liberarTarea(cancelar.id);
  assert.equal((await liberarTarea(cancelar.id)).repetida, true);
  assert.deepEqual((await leer(i)).slice(0, 2), ['1.0000', '0.0000']);
  assert.equal(await InventarioKardex.count({ where: { insumo_id: i.id } }), movimientosAntes);
  await assert.rejects(consumirTarea(cancelar.id, { usuarioId: usuario.id }), errorEs('RESERVA_FINALIZADA'));
  await assert.rejects(reservarTareas([cancelar.id]), errorEs('RESERVA_FINALIZADA'));
  const c = await nuevaTarea(i), d = await nuevaTarea(i);
  await assert.rejects(reservarTareas([c.id, d.id]), errorEs('STOCK_INSUFICIENTE'));
  assert.equal(await ReservaInsumo.count({ where: { tarea_id: [c.id, d.id] } }), 0);
  assert.deepEqual((await leer(i)).slice(0, 2), ['1.0000', '0.0000']);
  console.log('OK: cancelar solo libera; reserva agregada del lote revierte sin publicar parcialmente.');

  const fallo = await nuevaTarea(i);
  await reservarTareas([fallo.id]);
  InventarioKardex.addHook('beforeCreate', nombreHook, movimiento => {
    if (movimiento.operacion_uid === `tarea:${fallo.id}:insumo:${i.id}`) throw new Error('FALLO_SIMULADO_ANTES_KARDEX');
  });
  await assert.rejects(consumirTarea(fallo.id, { usuarioId: usuario.id }), /FALLO_SIMULADO_ANTES_KARDEX/);
  InventarioKardex.removeHook('beforeCreate', nombreHook);
  assert.deepEqual((await leer(i)).slice(0, 2), ['1.0000', '1.0000']);
  assert.equal((await ReservaInsumo.findOne({ where: { tarea_id: fallo.id } })).estado, 'reservada');
  assert.equal(await InventarioKardex.count({ where: { operacion_uid: `tarea:${fallo.id}:insumo:${i.id}` } }), 0);
  await consumirTarea(fallo.id, { usuarioId: usuario.id });
  assert.deepEqual((await leer(i)).slice(0, 2), ['0.0000', '0.0000']);
  console.log('OK: fallo entre saldo y Kardex revierte todo; el reintento registra un solo consumo.');

  const j = await crearInsumo('promedio');
  await ingreso(j, '2', '10', 'p1'); await ingreso(j, '1', '16', 'p2');
  assert.deepEqual(await leer(j), ['3.0000', '0.0000', '12.0000', '16.0000']);
  const repetidas = await Promise.all([ingreso(j, '1', '8', 'p3'), ingreso(j, '1', '8', 'p3')]);
  assert.equal(repetidas.filter(r => !r.repetida).length, 1);
  assert.deepEqual(await leer(j), ['4.0000', '0.0000', '11.0000', '8.0000']);
  await assert.rejects(ingreso(j, '2', '8', 'p3'), errorEs('OPERACION_EN_CONFLICTO'));
  await assert.rejects(ingreso(i, '1', '8', 'p3'), errorEs('OPERACION_EN_CONFLICTO'));
  const retirar = (tipo, cantidad, key) => registrarMovimiento({ insumo_id: j.id, tipo_transaccion: tipo,
    cantidad, operacion_uid: uid(key), usuario_id: usuario.id });
  for (const [n, tipo] of ['SALIDA_AJUSTE', 'SALIDA_MERMA', 'SALIDA_VENTA'].entries()) {
    const salida = await retirar(tipo, '0.5000', `salida${n}`);
    assert.equal(salida.movimiento.costo_unitario_transaccion, '11.0000');
  }
  await ingreso(j, '0.5000', '11', 'ajuste', 'INGRESO_AJUSTE');
  const compromiso = await nuevaTarea(j, '2'); await reservarTareas([compromiso.id]);
  await assert.rejects(retirar('SALIDA_AJUSTE', '1.0001', 'sobre-reserva'), errorEs('STOCK_INSUFICIENTE'));
  assert.deepEqual((await leer(j)).slice(0, 2), ['3.0000', '2.0000']);
  const historial = await InventarioKardex.findAll({ where: { insumo_id: j.id }, order: [['id', 'ASC']] });
  let acumulado = 0;
  for (const m of historial) { acumulado += Number(m.cantidad) * (m.tipo_transaccion.startsWith('INGRESO') ? 1 : -1); assert.equal(Number(m.saldo_posterior), acumulado); }
  console.log('OK: cinco tipos de Kardex, promedio, UID repetido/conflictivo y protección del stock comprometido.');

  const antes = await leer(j);
  await assert.rejects(sequelize.transaction(async transaction => {
    await consumirTarea(compromiso.id, { usuarioId: usuario.id, transaction });
    throw new Error('FALLO_ORQUESTADOR');
  }), /FALLO_ORQUESTADOR/);
  assert.deepEqual(await leer(j), antes);
  assert.equal((await ReservaInsumo.findOne({ where: { tarea_id: compromiso.id } })).estado, 'reservada');
  const sinStock = await nuevaTarea(j, '4');
  await assert.rejects(sequelize.transaction(async transaction => {
    await reservarTareas([sinStock.id], { transaction });
    await pedido.update({ notas_globales: 'NO DEBE CONFIRMARSE' }, { transaction });
  }), errorEs('STOCK_INSUFICIENTE'));
  await pedido.reload(); assert.equal(pedido.notas_globales, null);
  console.log('OK: composición en transacción externa y propagación de errores al orquestador.');

  const k = await crearInsumo('masa'), l = await crearInsumo('queso');
  await ingreso(k, '1', '12', 'masa'); await ingreso(l, '1', '20', 'queso');
  await RecetaBom.bulkCreate([
    { producto_venta_id: producto.id, insumo_id: k.id, cantidad_bruta_necesaria: '0.2500', porcentaje_merma_esperado: '20' },
    { producto_venta_id: producto.id, insumo_id: l.id, cantidad_bruta_necesaria: '0.5000', porcentaje_merma_esperado: '10' }
  ]);
  const resuelta = await resolverReceta({ producto_venta_id: producto.id, cantidad: 2, modificadores: [] });
  assert.equal(resuelta.estado, 'consultado');
  const compuesta = await tarea([[k, '0.2500'], [l, '0.5000']], 2);
  await compuesta.update({ snapshot_json: resuelta.receta });
  await reservarTareas([compuesta.id]);
  // Cambiar el maestro no modifica las cantidades ya comprometidas.
  await RecetaBom.update({ cantidad_bruta_necesaria: '1.0000' }, { where: { producto_venta_id: producto.id } });
  InventarioKardex.addHook('beforeCreate', nombreHook, movimiento => {
    if (movimiento.operacion_uid === `tarea:${compuesta.id}:insumo:${l.id}`) throw new Error('FALLO_SEGUNDO_INGREDIENTE');
  });
  await assert.rejects(consumirTarea(compuesta.id, { usuarioId: usuario.id }), /FALLO_SEGUNDO_INGREDIENTE/);
  InventarioKardex.removeHook('beforeCreate', nombreHook);
  assert.deepEqual((await leer(k)).slice(0, 2), ['1.0000', '0.5000']);
  assert.deepEqual((await leer(l)).slice(0, 2), ['1.0000', '1.0000']);
  assert.equal(await InventarioKardex.count({ where: { insumo_id: [k.id, l.id], tipo_transaccion: 'SALIDA_VENTA' } }), 0);
  await consumirTarea(compuesta.id, { usuarioId: usuario.id });
  assert.deepEqual((await leer(k)).slice(0, 2), ['0.5000', '0.0000']);
  assert.deepEqual((await leer(l)).slice(0, 2), ['0.0000', '0.0000']);
  assert.equal((await ReservaInsumo.findOne({ where: { tarea_id: compuesta.id, insumo_id: k.id } })).costo_total_snapshot, '6.0000');
  const bloqueada = await tarea([[k, '0.2500']]);
  await k.update({ quiebre_declarado: true });
  await assert.rejects(reservarTareas([bloqueada.id]), errorEs('INSUMO_NO_DISPONIBLE'));
  await k.update({ quiebre_declarado: false, activo: false });
  await assert.rejects(reservarTareas([bloqueada.id]), errorEs('INSUMO_NO_DISPONIBLE'));
  await k.update({ activo: true });
  const loteIncompleto = await tarea([[k, '0.2500'], [l, '0.2500']]);
  await assert.rejects(reservarTareas([loteIncompleto.id]), errorEs('STOCK_INSUFICIENTE'));
  assert.deepEqual((await leer(k)).slice(0, 2), ['0.5000', '0.0000']);
  assert.equal(await ReservaInsumo.count({ where: { tarea_id: loteIncompleto.id } }), 0);
  console.log('OK: snapshot del resolver, cantidades de dos platos sin doble merma, rollback del segundo ingrediente y quiebre/inactividad.');
} catch (error) {
  console.error('Fallo de integración de inventario:', error.codigo ?? error.message);
  process.exitCode = 1;
} finally {
  InventarioKardex.removeHook('beforeCreate', nombreHook);
  await sequelize.transaction(async transaction => {
    const tareasIds = registros.tareas.map(t => t.id), insumoIds = registros.insumos.map(i => i.id);
    if (tareasIds.length) await ReservaInsumo.destroy({ where: { tarea_id: tareasIds }, transaction });
    if (insumoIds.length) await InventarioKardex.destroy({ where: { insumo_id: insumoIds }, transaction });
    for (const t of registros.tareas) await KdsTarea.destroy({ where: { id: t.id, pedido_item_id: t.pedido_item_id }, transaction });
    for (const item of registros.items) await PedidoItemKds.destroy({ where: { id: item.id, pedido_id: pedido.id }, transaction });
    if (pedido) await PedidoMaster.destroy({ where: { id: pedido.id, codigo_pedido: pedido.codigo_pedido }, transaction });
    if (producto) await RecetaBom.destroy({ where: { producto_venta_id: producto.id }, transaction });
    for (const i of registros.insumos) await InsumoAlmacen.destroy({ where: { id: i.id, codigo: i.codigo }, transaction });
    if (producto) await ProductoVenta.destroy({ where: { id: producto.id, nombre: producto.nombre }, transaction });
    if (categoria) await CategoriaVenta.destroy({ where: { id: categoria.id, slug: categoria.slug }, transaction });
    if (unidad) await UnidadMedida.destroy({ where: { id: unidad.id, nombre: unidad.nombre }, transaction });
    if (usuario) await Usuario.destroy({ where: { id: usuario.id, email: usuario.email }, transaction });
  });
  await sequelize.close();
  console.log('Fixtures de fase 23 retirados.');
}
