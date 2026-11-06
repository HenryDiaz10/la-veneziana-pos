import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sequelize } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { ProductoVenta, VarianteProducto, InsumoAlmacen, ProductoModificador, ModificadorCatalogo, ModificadorItem, RecetaBom } from '../src/models/index.js';
import { importarRecetario } from '../src/services/carta-recetas-importacion.js';
import { resolverReceta } from '../src/services/recetas.service.js';
import { recetasCarta } from '../data/carta-recetas.mjs';
const huella = datos => createHash('sha256').update(JSON.stringify(datos)).digest('hex');
let tx;
try {
  assert.notEqual(env.entorno, 'production');
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(env.database.host));
  tx = await sequelize.transaction();
  const leerProtegidos = async () => ({
    productos: await ProductoVenta.findAll({ order: [['id', 'ASC']], transaction: tx, raw: true }),
    variantes: await VarianteProducto.findAll({ order: [['id', 'ASC']], transaction: tx, raw: true }),
    // Los saldos previos deben seguir iguales. Los nuevos se comprueban aparte.
    insumos: await InsumoAlmacen.findAll({ where: { id: idsPrevios }, order: [['id', 'ASC']], transaction: tx, raw: true }),
  });
  const idsPrevios = (await InsumoAlmacen.findAll({ attributes: ['id'], transaction: tx })).map(i => i.id);
  const antes = huella(await leerProtegidos());
  await importarRecetario({ aplicar: true, merma: true, transaction: tx });
  const repeticion = await importarRecetario({ aplicar: true, transaction: tx });
  assert.ok(Object.values(repeticion.cambios).every(n => n === 0), 'Repetir debe ser inocuo');
  const americana = await ProductoVenta.findOne({ where: { sku: 'CARTA-PIZ-AMERICANA' }, transaction: tx });
  const queso = await InsumoAlmacen.findOne({ where: { codigo: 'REC-MOZZARELLA' }, transaction: tx });
  const baseAmericana = await RecetaBom.findOne({ where: { producto_venta_id: americana.id, variante_id: null, insumo_id: queso.id }, transaction: tx });
  assert.equal(baseAmericana.cantidad_bruta_necesaria, '0.1020');
  assert.equal(baseAmericana.porcentaje_merma_esperado, '2.00');
  const resuelta = await resolverReceta({ producto_venta_id: americana.id, cantidad: 2, modificadores: [] }, { transaction: tx });
  assert.equal(resuelta.receta.ingredientes.find(i => i.insumo_id === queso.id).cantidad_bruta_total, '0.2040', 'No aplicar merma otra vez al reservar');
  assert.equal(huella(await leerProtegidos()), antes, 'No cambiar productos, precios, variantes ni saldos previos');
  const nuevos = await InsumoAlmacen.findAll({ transaction: tx });
  for (const i of nuevos.filter(i => !idsPrevios.includes(i.id))) {
    for (const campo of ['stock_fisico', 'stock_reservado', 'costo_promedio', 'ultimo_costo']) assert.equal(Number(i[campo]), 0);
  }
  const productos = await ProductoVenta.findAll({ transaction: tx });
  const variantes = await VarianteProducto.findAll({ transaction: tx });
  let verificadas = 0;
  for (const r of recetasCarta) {
    const p = productos.find(p => p.sku === r.sku);
    const v = r.variante === null ? null : variantes.find(v => v.producto_id === p.id && v.nombre_variante === r.variante);
    const vinculos = await ProductoModificador.findAll({ where: { producto_id: p.id }, transaction: tx });
    const grupos = vinculos.length ? await ModificadorCatalogo.findAll({ where: { id: vinculos.map(v => v.grupo_id) }, transaction: tx }) : [];
    const selecciones = [];
    for (const g of grupos.filter(g => g.es_obligatorio)) {
      const opcion = await ModificadorItem.findOne({ where: { grupo_id: g.id }, order: [['id', 'ASC']], transaction: tx });
      selecciones.push(opcion.id);
    }
    const resolver = modificadores => resolverReceta({ producto_venta_id: p.id, variante_id: v?.id ?? null, cantidad: 1, modificadores }, { transaction: tx });
    assert.equal((await resolver(selecciones)).estado, 'consultado', `${r.sku}/${r.variante}`);
    // También probar todas las alternativas y opcionales de cada presentación.
    for (const g of grupos) for (const o of await ModificadorItem.findAll({ where: { grupo_id: g.id }, transaction: tx })) {
      const otras = [];
      for (const id of selecciones) {
        const elegida = await ModificadorItem.findByPk(id, { transaction: tx });
        if (elegida.grupo_id !== g.id) otras.push(id);
      }
      assert.equal((await resolver([...otras, o.id])).estado, 'consultado', `${r.sku}/${r.variante}/${o.nombre_modificador}`);
    }
    verificadas++;
  }
  // Una modificación manual debe impedir la recarga, nunca ser sobreescrita.
  const bom = await RecetaBom.findOne({ transaction: tx });
  await bom.update({ cantidad_bruta_necesaria: '9.8765' }, { transaction: tx });
  await assert.rejects(importarRecetario({ aplicar: true, transaction: tx }), /existente distinta/);
  assert.equal((await RecetaBom.findByPk(bom.id, { transaction: tx })).cantidad_bruta_necesaria, '9.8765');
  console.log(`OK: ${verificadas} recetas y todas sus opciones; carga repetible, protección de ediciones y saldos. Prueba revertida.`);
} catch (e) { console.error(e.name, e.message); process.exitCode = 1; }
finally { if (tx && !tx.finished) await tx.rollback(); await sequelize.close(); }
