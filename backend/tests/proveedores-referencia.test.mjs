import test from 'node:test';
import assert from 'node:assert/strict';
import { proveedoresReferencia, referenciasCoincidentes } from '../data/proveedores-referencia.mjs';
import { validarProveedor } from '../src/validators/compras.js';
test('referencias reales con fuentes; ejemplo ficticio explícito sin contacto inventado', () => {
  assert.equal(proveedoresReferencia.length, 7);
  assert.equal(new Set(proveedoresReferencia.map(p => p.ruc)).size, 7);
  for (const p of proveedoresReferencia) {
    const { razon_social, ruc, telefono_contacto, correo_contacto } = p;
    assert.ok(validarProveedor({ razon_social, ruc, telefono_contacto, correo_contacto }));
    if (p.ficticio) {
      assert.match(p.razon_social, /FICTICIO/);
      assert.equal(p.ruc, '00000000001');
      assert.equal(p.telefono_contacto, null);
    } else {
      assert.ok(p.fuentes.length>0);
      assert.match(p.ruc, /^20\d{9}$/);
    }
  }
});
test('búsqueda por marca y alimento, sin confundir Cielo con San Luis', () => {
  for (const [texto, ruc] of [['alacena','20100055237'], ['KÉTCHUP','20100055237'], ['hot dog','20100154308'], ['Coca Cola','20101024645'], ['inka',null], ['San Luis','20101024645'], ['Cielo','20331061655']]) {
    const resultados=referenciasCoincidentes(proveedoresReferencia,texto);
    if(ruc) assert.ok(resultados.includes(ruc),texto);
    else assert.deepEqual(resultados,[]);
  }
  assert.deepEqual(referenciasCoincidentes(proveedoresReferencia,''),[]);
});
