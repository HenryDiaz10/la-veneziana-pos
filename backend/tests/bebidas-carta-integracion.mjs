import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Op } from 'sequelize';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { ProductoVenta, InsumoAlmacen } from '../src/models/index.js';
import { productosCarta } from '../data/carta-veneziana.mjs';
assert.ok(env.entorno !== 'production' && ['localhost','127.0.0.1','::1'].includes(env.database.host));
// Esta prueba aplica la actualización autorizada de la carta real. No es un
// fixture desechable: mantiene los cambios, comprueba los IDs/saldos previos
// y una segunda ejecución demuestra que no se duplican productos ni insumos.
async function snapshot() {
  const productos = await ProductoVenta.findAll({ where: { sku: { [Op.like]: 'CARTA-%' } },
    attributes: ['id','sku','precio_venta_base','insumo_directo_id','estado'], order: [['id','ASC']], raw:true });
  const insumos = await InsumoAlmacen.findAll({ where: { codigo: { [Op.like]: 'CARTA-%' } },
    attributes: ['id','codigo','stock_fisico','stock_reservado','ultimo_costo'], order: [['id','ASC']], raw:true });
  return { productos, insumos };
}
function aplicar() {
  const r = spawnSync(process.execPath, ['scripts/importar-carta.mjs','--aplicar','--actualizar-imagenes','--actualizar-bebidas'], { encoding:'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  console.log(r.stdout.trim());
}
try {
  const antes = await snapshot();
  aplicar();
  const despues = await snapshot();
  for (const p of antes.productos) assert.deepEqual(despues.productos.find(n => n.id === p.id), p, `Conservar producto ${p.sku}`);
  for (const i of antes.insumos) assert.deepEqual(despues.insumos.find(n => n.id === i.id), i, `Conservar stock/costo ${i.codigo}`);
  for (const p of productosCarta) {
    const registro = await ProductoVenta.findOne({ where:{sku:p.sku} });
    assert.ok(registro);
    if (p.categoria === 'frias') assert.equal(registro.nombre, p.nombre);
  }
  assert.equal(despues.productos.length, 97);
  aplicar();
  assert.deepEqual(await snapshot(), despues, 'La segunda importación no altera IDs, cantidades, precios o stock');
  console.log('OK: 97 productos, marcas y agua corregidas; IDs, precios, estados, vínculos y saldos anteriores conservados. Repetición idempotente.');
} finally { await sequelize.close(); }
