import { writeFile } from 'node:fs/promises';
import { sequelize } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { importarRecetario } from '../src/services/carta-recetas-importacion.js';
import { recetasCarta, insumosRecetario, opcionesRecetario } from '../data/carta-recetas.mjs';
import { productosCarta } from '../data/carta-veneziana.mjs';
import { aplicarMermaIngrediente } from '../data/carta-mermas.mjs';
try {
  if (process.argv.slice(2).some(v => !['--aplicar', '--merma'].includes(v))) throw new Error('Uso: node scripts/cargar-recetas-carta.mjs [--aplicar] [--merma]');
  if (env.entorno === 'production' || !['localhost', '127.0.0.1', '::1'].includes(env.database.host)) throw new Error('Esta carga está limitada a la base local de desarrollo.');
  const resultado = await importarRecetario({ aplicar: process.argv.includes('--aplicar'), merma: process.argv.includes('--merma') });
  const convertir = i => resultado.conMerma ? aplicarMermaIngrediente(i) : { ...i, cantidad_neta_referencia: i.cantidad, merma: '0.00' };
  const porClave = new Map(insumosRecetario.map(i => [i.clave, i]));
  const filas = [['SKU', 'Producto', 'Presentación', 'Ingrediente', 'Cantidad bruta base', 'Unidad', 'Origen', 'Objetivo neto base', 'Merma estimada %']];
  for (const r of recetasCarta) for (const i of r.ingredientes.map(convertir)) filas.push([r.sku, productosCarta.find(p => p.sku === r.sku).nombre, r.variante ?? 'Base', porClave.get(i.insumo).nombre, i.cantidad, porClave.get(i.insumo).unidad, 'Referencia: base indicada y cantidades estimadas', i.cantidad_neta_referencia, i.merma]);
  for (const p of productosCarta.filter(p => p.directo)) filas.push([p.sku, p.nombre, 'Envase comercial', p.nombre, '1.0000', 'un', 'Artículo directo existente', '1.0000', '0.00']);
  for (const o of opcionesRecetario) for (const i of o.ingredientes.map(convertir)) filas.push(['OPCION', o.grupo, o.opcion, porClave.get(i.insumo).nombre, i.cantidad, porClave.get(i.insumo).unidad, 'Porción estimada adicional', i.cantidad_neta_referencia, i.merma]);
  await writeFile(new URL('../data/recetas-carta.csv', import.meta.url), '\uFEFF' + filas.map(f => f.map(c => '"' + String(c).replaceAll('"', '""') + '"').join(';')).join('\r\n'), 'utf8');
  console.log(JSON.stringify(resultado));
} catch (e) { console.error('No se completó la carga:', e.name === 'SequelizeDatabaseError' ? 'Revisa la conexión/esquema de la base.' : e.message); process.exitCode = 1; }
finally { await sequelize.close(); }
