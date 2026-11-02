import test from 'node:test';
import assert from 'node:assert/strict';
import { comandoKds, transicionKds } from '../src/services/kds-reglas.js';
const tarea = (estado = 'espera', canal = 'cocina') => ({ estado, version: 1, iniciado_en: null, snapshot_json: { canal } });
test('cocina consume al inicio, horno/listo no consumen; entrega de bebida consume', () => {
  assert.equal(transicionKds(tarea(), comandoKds({ version: 1, estado: 'preparando' })).consumir, true);
  for (const [de, a] of [['preparando', 'horno'], ['horno', 'listo_para_entrega'], ['listo_para_entrega', 'entregado']]) assert.equal(transicionKds(tarea(de), comandoKds({ version: 1, estado: a })).consumir, false);
  assert.equal(transicionKds(tarea('espera', 'despacho'), comandoKds({ version: 1, estado: 'entregado' })).consumir, true);
});
test('cancelación temprana libera y tardía exige autorización sin restituir consumo', () => {
  const comando = comandoKds({ version: 1, estado: 'cancelado', motivo: 'Error de selección' });
  assert.equal(transicionKds(tarea(), comando).liberar, true);
  assert.equal(transicionKds(tarea('preparando'), comando).autorizar, true);
  assert.equal(transicionKds(tarea('horno'), comando).liberar, false);
});
test('versiones, terminales y saltos inválidos se rechazan', () => {
  for (const [de, a, canal] of [['espera', 'entregado', 'cocina'], ['entregado', 'preparando', 'cocina'], ['cancelado', 'entregado', 'despacho'], ['espera', 'horno', 'despacho']]) assert.throws(() => transicionKds(tarea(de, canal), comandoKds({ version: 1, estado: a })));
  assert.throws(() => transicionKds(tarea(), { version: 2, estado: 'preparando' }), { codigo: 'TAREA_KDS_DESACTUALIZADA' });
  for (const d of [{ version: 0, estado: 'preparando' }, { version: 1, estado: 'cancelado' }, { version: 1, estado: 'preparando', usuarioId: 7 }, { version: 1, estado: 'horno', autorizacion_id: '1' }]) assert.throws(() => comandoKds(d));
});
