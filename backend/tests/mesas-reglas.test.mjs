import test from 'node:test';
import assert from 'node:assert/strict';
import { idMesa, revisionMesa, validarComandoMesa, transicionMesa } from '../src/services/mesas-reglas.js';
const libre = { id: 1, zona_id: 2, codigo_mesa: 'M01', capacidad_sillas: 4, estado_actual: 'libre', mesero_asignado_id: null, posicion_x: 0, posicion_y: 0 };
const rechaza = (fn, codigo) => assert.throws(fn, e => e.codigo === codigo);
test('identificadores y comandos acotados: sin estado o responsable aportado por el cliente', () => {
  assert.equal(idMesa('2147483647'), 2147483647);
  for (const id of ['01', '1e2', '0', '2147483648', 1.5, null, true]) rechaza(() => idMesa(id), 'DATOS_INVALIDOS');
  const b = { revision: 'a'.repeat(64), motivo: '  Clientes   se retiraron  ' };
  assert.equal(validarComandoMesa('liberar', b).motivo, 'Clientes se retiraron');
  for (const invalido of [{ revision: b.revision }, { ...b, estado_actual: 'libre' }, { ...b, mesero_asignado_id: 9 }, { ...b, revision: 'x' }, { ...b, motivo: 'x'.repeat(251) }]) rechaza(() => validarComandoMesa('liberar', invalido), 'DATOS_INVALIDOS');
});
test('ciclo completo conserva responsable hasta limpieza, sin salto de ocupada a libre', () => {
  const ocupada = { ...libre, ...transicionMesa('ocupar', libre, null, 7) };
  assert.equal(ocupada.mesero_asignado_id, 7);
  const sucia = { ...ocupada, ...transicionMesa('liberar', ocupada, null, 8) };
  assert.equal(sucia.estado_actual, 'sucia_por_limpiar'); assert.equal(sucia.mesero_asignado_id, 7);
  assert.deepEqual(transicionMesa('limpiar', sucia, null, 8), { estado_actual: 'libre', mesero_asignado_id: null });
  rechaza(() => transicionMesa('limpiar', ocupada, null, 8), 'TRANSICION_MESA_NO_VALIDA');
});
test('cuenta activa bloquea transiciones incluso en un estado inconsistente; null e inhabilitada no se habilitan', () => {
  for (const accion of ['ocupar', 'liberar', 'limpiar']) rechaza(() => transicionMesa(accion, libre, { estado_cuenta: 'bloqueada_en_pago' }, 7), 'MESA_CON_CUENTA_ACTIVA');
  for (const estado_actual of ['inhabilitada', null]) for (const accion of ['ocupar', 'liberar', 'limpiar']) rechaza(() => transicionMesa(accion, { ...libre, estado_actual }, null, 7), 'TRANSICION_MESA_NO_VALIDA');
});
test('revisión detecta cuenta, versión, asignación y ciclos repetidos mediante auditoría, sin perder BIGINT', () => {
  const revision = revisionMesa(libre, null, '9007199254740992');
  assert.match(revision, /^[a-f0-9]{64}$/);
  assert.notEqual(revision, revisionMesa(libre, null, '9007199254740993'));
  assert.notEqual(revision, revisionMesa({ ...libre, mesero_asignado_id: 7 }, null, '9007199254740992'));
  const p = { id: '9007199254740993', version: 1, estado_cuenta: 'abierta' };
  assert.notEqual(revisionMesa(libre, p), revisionMesa(libre, { ...p, version: 2 }));
  assert.notEqual(revisionMesa(libre, p), revisionMesa(libre, { ...p, estado_cuenta: 'bloqueada_en_pago' }));
});
