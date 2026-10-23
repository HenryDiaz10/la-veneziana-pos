import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { categoriasCarta, productosCarta, gruposCarta, tarifasDelivery } from '../data/carta-veneziana.mjs';
import { validarProducto } from '../src/validators/productos.js';
import { validarVariante } from '../src/validators/variantes.js';
const imagenes = JSON.parse(await readFile(new URL('../data/carta-imagenes.json', import.meta.url), 'utf8'));

test('caldo de gallina exige una presa propia sin cambiar el precio ni las otras sopas', () => {
  const caldo = productosCarta.find(p => p.sku === 'CARTA-SOP-GALLINA');
  assert.ok(caldo.grupos.includes('presa-gallina'));
  assert.equal(caldo.precio, '14.00');
  assert.deepEqual(gruposCarta['presa-gallina'], { nombre: 'Presa del caldo de gallina', obligatorio: true, opciones: ['Pecho (pechuga)', 'Pierna'] });
  assert.ok(productosCarta.filter(p => p.categoria === 'sopas' && p !== caldo).every(p => !p.grupos.includes('presa-gallina')));
});

test('carta completa: 97 productos únicos, 11 categorías y 109 presentaciones', () => {
  assert.equal(productosCarta.length, 97);
  assert.equal(categoriasCarta.length, 11);
  assert.equal(new Set(productosCarta.map(p => p.sku)).size, 97);
  assert.equal(productosCarta.reduce((n, p) => n + (p.variantes?.length ?? 0), 0), 109);
  for (const p of productosCarta) {
    assert.ok(categoriasCarta.some(c => c.clave === p.categoria));
    assert.ok(p.sku.length <= 50);
    assert.ok(validarProducto({ nombre: p.nombre, categoria_id: 1, precio_venta_base: p.precio,
      imagen_url: imagenes[p.imagen].url, descripcion: p.descripcion || null, sku: p.sku }));
  }
});

test('precios exactos por presentación, incluyendo cecina familiar confirmada en S/41', () => {
  const cecina = productosCarta.find(p => p.sku === 'CARTA-PIZ-CECINA');
  assert.deepEqual(cecina.variantes.map(v => v.precio), ['21.00', '32.00', '41.00']);
  for (const p of productosCarta) for (const v of p.variantes ?? []) {
    const centimos = s => BigInt(s.replace('.', ''));
    const adicional = centimos(v.precio) - centimos(p.precio);
    assert.ok(adicional >= 0n);
    assert.ok(validarVariante({ nombre_variante: v.nombre, precio_adicional: `${adicional / 100n}.${String(adicional % 100n).padStart(2, '0')}` }));
  }
});

test('fotos HTTPS con autoría, licencia y URL válida para la base de datos', () => {
  for (const p of productosCarta) {
    const i = imagenes[p.imagen];
    assert.ok(i?.url.startsWith('https://') && i.url.length <= 255);
    assert.ok(i.autor && i.licencia && i.fuente.startsWith('https://'));
  }
});

test('envases separados, adicionales y delivery mantienen las marcas confirmadas sin inventar existencias', () => {
  assert.equal(productosCarta.filter(p => p.directo).length, 14);
  assert.equal(productosCarta.filter(p => p.sku.startsWith('CARTA-FRI-GAS-')).length, 6);
  assert.deepEqual(gruposCarta.adicionales.opciones.map(o => o.precio), ['8.00', '6.00', '2.00']);
  assert.equal(tarifasDelivery.length, 15);
  assert.ok(!productosCarta.some(p => p.categoria === 'delivery'));
});

// Regresiones de la corrección indicada por el propietario.
test('frozen con nueve fotos distintas y marcas con presentaciones correctas', () => {
  const frozen = productosCarta.filter(p => p.categoria === 'frozen');
  assert.equal(frozen.length, 9);
  assert.equal(new Set(frozen.map(p => imagenes[p.imagen].url)).size, 9);
  const inca = productosCarta.filter(p => p.sku.startsWith('CARTA-FRI-GAS-'));
  const coca = productosCarta.filter(p => p.sku.startsWith('CARTA-FRI-COCA-'));
  assert.equal(inca.length, 6);
  assert.equal(coca.length, 5);
  assert.ok(inca.every(p => p.nombre.startsWith('Inca Kola')));
  assert.ok(coca.every(p => p.nombre.startsWith('Coca-Cola') && !p.nombre.includes('gordita')));
  assert.ok(inca.some(p => p.nombre === 'Inca Kola gordita' && p.precio === '6.00'));
  assert.notEqual(imagenes[inca[0].imagen].url, imagenes[coca[0].imagen].url);
  for (const p of coca) {
    const par = inca.find(i => i.sku.replace('CARTA-FRI-GAS-', '') === p.sku.replace('CARTA-FRI-COCA-', ''));
    assert.equal(par.precio, p.precio);
  }
  const agua = productosCarta.find(p => p.sku === 'CARTA-FRI-AGUA');
  assert.equal(agua.nombre, 'Agua San Luis 625 ml');
  assert.equal(agua.precio, '3.00');
});

test('los catorce tragos y cervezas tienen imágenes individuales, incluida Pantera rosa', () => {
  const tragos = productosCarta.filter(p => p.categoria === 'tragos');
  assert.equal(tragos.length, 14);
  assert.equal(new Set(tragos.map(p => imagenes[p.imagen].url)).size, 14);
  for (const p of tragos) assert.notEqual(p.imagen, 'coctel');
  const pantera = tragos.find(p => p.clave === 'TRA-PANTERA');
  assert.equal(pantera.imagen, 'tra-pantera');
  assert.ok(imagenes[pantera.imagen].archivo.includes('Pantera rosa'));
});
