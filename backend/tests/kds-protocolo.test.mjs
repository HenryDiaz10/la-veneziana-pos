import test from 'node:test';
import assert from 'node:assert/strict';
import { consultaKds, notificacionKds, demoraReintentoKds, presentarTareaKds } from '../src/services/kds-protocolo.js';
const evento = () => ({ event_uid: 'evento_kds_prueba', tipo: 'pedido.cocina', version: 2, payload_json: { pedido_id: '9007199254740993', tareas: ['9007199254740994'], secreto: 'NO_PUBLICAR' } });
test('notificación mínima conserva BIGINT y canal sin publicar JSON arbitrario', () => {
  const n = notificacionKds(evento());
  assert.equal(n.pedido_id, '9007199254740993'); assert.deepEqual(n.tareas, ['9007199254740994']);
  assert.ok(!JSON.stringify(n).includes('NO_PUBLICAR')); assert.equal(n.canal, 'cocina');
  assert.equal(notificacionKds({ ...evento(), tipo: 'pedido.despacho' }).canal, 'despacho');
  for (const cambio of [e => { e.tipo = 'venta.confirmada'; }, e => { e.payload_json.tareas = []; }, e => { e.payload_json.tareas.push(e.payload_json.tareas[0]); }, e => { e.payload_json.pedido_id = 9007199254740992; }]) {
    const e = evento(); cambio(e); assert.throws(() => notificacionKds(e));
  }
});
test('paginación acotada y cursores exactos rechazan arrays, campos desconocidos y rangos invertidos', () => {
  assert.equal(consultaKds({ canal: 'despacho', desde: '9007199254740993', hasta: '9007199254740994', limite: '200' }).desde, '9007199254740993');
  for (const q of [{ canal: 'todo' }, { limite: ['100'] }, { limite: '201' }, { limite: '0' }, { desde: '01' }, { desde: '3', hasta: '2' }, { token: 'secreto' }]) assert.throws(() => consultaKds(q));
});
test('reintento exponencial limitado, sin abandono silencioso del evento', () => {
  assert.deepEqual([1, 2, 3, 7, 100].map(demoraReintentoKds), [1000, 2000, 4000, 60000, 60000]);
  assert.throws(() => demoraReintentoKds(0));
});
test('proyección de tarea conserva notas, exclusión y destino sin costos, recetas o datos privados', () => {
  const tarea = { id: '9007199254740993', componente_numero: 2, cantidad: 3, estado: 'espera', version: 1,
    snapshot_json: { nombre_producto: 'Pizza', canal: 'cocina', ingredientes: [{ costo: 'SECRETO' }], modificadores: [{ id: 7, nombre: 'Sin aceitunas', es_exclusion: true }], indicaciones: 'Poco ají' } };
  const t = presentarTareaKds(tarea, { id: '88', notas_preparacion: 'Anterior' }, { id: '99', codigo_pedido: 'P-1', tipo_atencion: 'salon', estado_cuenta: 'pagada', cliente: 'SECRETO' }, { id: 1, codigo_mesa: 'M01', zona_id: 2 });
  assert.equal(t.id, tarea.id); assert.equal(t.componente_numero, 2); assert.equal(t.indicaciones, 'Poco ají');
  assert.equal(t.modificadores[0].es_exclusion, true); assert.equal(t.pedido.mesa.codigo, 'M01');
  assert.ok(!JSON.stringify(t).includes('SECRETO'));
});
