import test from 'node:test';
import assert from 'node:assert/strict';
import { recetasCarta, opcionesRecetario, insumosRecetario } from '../data/carta-recetas.mjs';
import { productosCarta } from '../data/carta-veneziana.mjs';
const receta = (clave, variante = null) => recetasCarta.find(r => r.sku === `CARTA-${clave}` && r.variante === variante);
const cantidad = (r, clave) => r.ingredientes.find(i => i.insumo === clave)?.cantidad;

test('todos los preparados tienen base y todas sus presentaciones completas', () => {
  assert.equal(productosCarta.length, 97);
  assert.equal(recetasCarta.length, 192);
  for (const p of productosCarta) {
    const filas = recetasCarta.filter(r => r.sku === p.sku);
    assert.equal(filas.length, p.directo ? 0 : 1 + (p.variantes?.length ?? 0));
    if (!p.directo) assert.ok(filas.some(r => r.variante === null));
  }
  const claves = new Set(insumosRecetario.map(i => i.clave));
  for (const r of [...recetasCarta, ...opcionesRecetario]) {
    assert.equal(new Set(r.ingredientes.map(i => i.insumo)).size, r.ingredientes.length);
    for (const i of r.ingredientes) {
      assert.ok(claves.has(i.insumo));
      assert.match(i.cantidad, /^\d+\.\d{4}$/);
      assert.ok(BigInt(i.cantidad.replace('.', '')) > 0n);
    }
  }
});
test('pizza respeta las tres referencias y los sabores crecen por tamaño', () => {
  for (const [tam, harina, queso, salsa, jamon] of [
    ['Personal', '0.2000', '0.1000', '0.0150', '0.0300'],
    ['Mediana', '0.3000', '0.1400', '0.0300', '0.0450'],
    ['Familiar', '0.4000', '0.2000', '0.0450', '0.0600'],
  ]) {
    const r = receta('PIZ-AMERICANA', tam);
    for (const [k, v] of Object.entries({ harina, mozzarella: queso, salsa_tomate: salsa, jamon })) assert.equal(cantidad(r, k), v);
  }
  assert.equal(cantidad(receta('PIZ-GORDO-JEU', 'Familiar'), 'mozzarella'), '0.4000');
  assert.equal(cantidad(receta('PIZ-BORDECITOS'), 'mozzarella'), '0.4800');
});
test('las elecciones reemplazables no se descuentan también desde la base', () => {
  for (const k of ['HAM-CLASICA', 'HAM-ROYALE', 'HAM-SUPER-CLASICA']) {
    for (const ins of ['carne_molida', 'pollo_molido', 'edam', 'cheddar']) assert.equal(cantidad(receta(k), ins), undefined);
  }
  for (const k of ['pechuga', 'pierna', 'arroz']) assert.equal(cantidad(receta('CRI-BROASTER'), k), undefined);
  assert.equal(opcionesRecetario.find(o => o.opcion === 'Sin arroz').ingredientes.length, 0);
  assert.equal(cantidad(receta('SOP-GALLINA'), 'gallina_pecho'), undefined);
});
test('jarra y docena escalan sus ingredientes, Alfredo sustituye la carne', () => {
  for (const p of productosCarta.filter(p => !p.directo)) for (const v of p.variantes ?? []) {
    const factor = v.nombre.startsWith('Docena') ? 12 : p.categoria === 'frozen' && v.nombre === '1 litro' ? 2 : p.categoria === 'tragos' && v.nombre === '1 litro' ? 4 : 0;
    if (!factor) continue;
    const base = recetasCarta.find(r => r.sku === p.sku && r.variante === null);
    const r = recetasCarta.find(r => r.sku === p.sku && r.variante === v.nombre);
    for (const i of base.ingredientes) assert.ok(Math.abs(Number(cantidad(r, i.insumo)) - Number(i.cantidad) * factor) <= 0.0006);
  }
  assert.equal(cantidad(receta('PAS-ALFREDO', 'De lomo'), 'pollo'), undefined);
  assert.equal(cantidad(receta('PAS-ALFREDO', 'De lomo'), 'res'), '0.1200');
});
