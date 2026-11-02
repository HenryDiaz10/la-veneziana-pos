import test from 'node:test'
import assert from 'node:assert/strict'
import { validarTareaKds, accionesKds, mezclarTareaKds, destinoKds } from '../src/utils/kds-tablero.js'
const tarea = () => ({ id: '9007199254740993', pedido_item_id: '1', componente_numero: 2, version: 3, estado: 'preparando', canal: 'cocina', cantidad: 2, nombre: 'Pizza', indicaciones: 'Sin ají', enviado_en: '2026-11-02T10:00:00Z', modificadores: [{ id: 1, nombre: 'Sin aceitunas', es_exclusion: true }], pedido: { id: '2', codigo: 'P-1', tipo_atencion: 'salon', mesa: { codigo: 'M01' } } })
test('BIGINT, componentes, destino y exclusiones se conservan', () => {
  const t = validarTareaKds(tarea()); assert.equal(t.componente_numero, 2); assert.equal(destinoKds(t), 'Mesa M01'); assert.equal(t.modificadores[0].es_exclusion, true)
  for (const c of [{ version: 0 }, { cantidad: -1 }, { estado: 'otro' }, { id: 9007199254740992 }, { modificadores: [{}] }]) assert.throws(() => validarTareaKds({ ...t, ...c }))
})
test('respuestas viejas no revierten versiones y terminales salen del tablero', () => {
  const t = tarea(); assert.equal(mezclarTareaKds([t], { ...t, version: 2, estado: 'espera' })[0].estado, 'preparando')
  assert.equal(mezclarTareaKds([t], { ...t, version: 4, estado: 'entregado' }).length, 0)
  assert.equal(mezclarTareaKds([t], { ...t, id: '9007199254740994', componente_numero: 3 }).length, 2)
})
test('controles equivalentes por canal y estado', () => {
  assert.deepEqual(accionesKds({ ...tarea(), canal: 'despacho', estado: 'espera' }), ['entregado', 'cancelado'])
  assert.deepEqual(accionesKds({ ...tarea(), estado: 'listo_para_entrega' }), ['entregado', 'cancelado'])
  assert.deepEqual(accionesKds({ ...tarea(), estado: 'entregado' }), [])
})
