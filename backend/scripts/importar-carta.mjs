// Importación explícita, transaccional e idempotente de la carta del negocio.
// Sin --aplicar solo valida el manifiesto; no escribe en MySQL.
import { readFile, writeFile } from 'node:fs/promises';
import { sequelize } from '../src/config/database.js';
import { CategoriaVenta, ProductoVenta, VarianteProducto, UnidadMedida, InsumoAlmacen,
  ModificadorCatalogo, ModificadorItem, ProductoModificador, ConfiguracionGlobal, AuditLog } from '../src/models/index.js';
import { categoriasCarta, productosCarta, gruposCarta, tarifasDelivery } from '../data/carta-veneziana.mjs';
import { validarProducto } from '../src/validators/productos.js';
import { validarCategoria } from '../src/validators/categorias.js';
import { validarVariante } from '../src/validators/variantes.js';

const imagenes = JSON.parse((await readFile(new URL('../data/carta-imagenes.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
const centimos = texto => BigInt(texto.replace('.', ''));
const decimal = valor => `${valor / 100n}.${String(valor % 100n).padStart(2, '0')}`;
const exigir = (condicion, mensaje) => { if (!condicion) throw new Error(mensaje); };
const escape = texto => String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Validar todo antes de iniciar una transacción de escritura.
exigir(new Set(productosCarta.map(p => p.sku)).size === productosCarta.length, 'SKU duplicado en el manifiesto.');
for (const p of productosCarta) {
  exigir(categoriasCarta.some(c => c.clave === p.categoria), `Categoría desconocida: ${p.sku}`);
  exigir(imagenes[p.imagen]?.url?.startsWith('https://') && imagenes[p.imagen].url.length <= 255, `Imagen inválida: ${p.sku}`);
  exigir(/^\d+\.\d{2}$/.test(p.precio), `Precio inválido: ${p.sku}`);
  for (const v of p.variantes ?? []) {
    const adicional = centimos(v.precio) - centimos(p.precio);
    exigir(adicional >= 0n && validarVariante({ nombre_variante: v.nombre, precio_adicional: decimal(adicional) }), `Variante inválida: ${p.sku}`);
  }
}

try {
  const totales = { categorias: categoriasCarta.length, productos: productosCarta.length,
    variantes: productosCarta.reduce((n, p) => n + (p.variantes?.length ?? 0), 0),
    articulosSinSaldoInicial: productosCarta.filter(p => p.directo).length, tarifasDelivery: tarifasDelivery.length };
  console.log('Manifiesto validado:', JSON.stringify(totales));
  // Hoja de revisión legible para contrastar todos los precios con el PDF.
  const filasPrecios = [['SKU', 'Producto', 'Categoría', 'Presentación', 'Precio PEN', 'Página PDF']];
  for (const p of productosCarta) {
    for (const v of p.variantes ?? [{ nombre: 'Presentación única', precio: p.precio }]) {
      filasPrecios.push([p.sku, p.nombre, p.categoria, v.nombre, v.precio, String(p.pagina)]);
    }
  }
  await writeFile(new URL('../data/carta-precios.csv', import.meta.url), '\uFEFF' +
    filasPrecios.map(fila => fila.map(valor => `"${String(valor).replaceAll('"', '""')}"`).join(';')).join('\n') + '\n');
  if (process.argv.includes('--aplicar')) {
    const resultado = await sequelize.transaction(async transaction => {
      const cambios = { categorias: 0, productos: 0, variantes: 0, insumos: 0, grupos: 0, opciones: 0, vinculos: 0, imagenes: 0, datosBebidas: 0 };
      const correccionesBebidas = [];
      const categoriaIds = {};
      for (const c of categoriasCarta) {
        const valores = { nombre: c.nombre, slug: c.clave, color_hex: c.color, orden_visual: c.orden, es_para_kds: c.cocina, activa: true };
        exigir(validarCategoria(valores), `Categoría inválida: ${c.clave}`);
        const [categoria, creada] = await CategoriaVenta.findOrCreate({ where: { slug: c.clave }, defaults: valores, transaction });
        exigir(categoria.activa, `La categoría ${c.clave} está inactiva. No se modificará automáticamente.`);
        categoriaIds[c.clave] = categoria.id;
        if (creada) cambios.categorias++;
      }
      const [unidad] = await UnidadMedida.findOrCreate({ where: { abreviatura: 'un' }, defaults: { nombre: 'Unidad' }, transaction });
      const grupoIds = {};
      for (const [clave, g] of Object.entries(gruposCarta)) {
        const [grupo, creado] = await ModificadorCatalogo.findOrCreate({ where: { nombre_grupo: g.nombre },
          defaults: { es_multiple: Boolean(g.multiple), es_obligatorio: g.obligatorio }, transaction });
        grupoIds[clave] = grupo.id;
        if (creado) cambios.grupos++;
        for (const opcion of g.opciones) {
          const nombre = typeof opcion === 'string' ? opcion : opcion.nombre;
          const precio = typeof opcion === 'string' ? '0.00' : opcion.precio;
          const [, creada] = await ModificadorItem.findOrCreate({ where: { grupo_id: grupo.id, nombre_modificador: nombre },
            defaults: { precio_adicional: precio, es_exclusion: false }, transaction });
          if (creada) cambios.opciones++;
        }
      }
      for (const p of productosCarta) {
        let producto = await ProductoVenta.findOne({ where: { sku: p.sku }, transaction, lock: transaction.LOCK.UPDATE });
        if (!producto) {
          const homonimo = await ProductoVenta.findOne({ where: { nombre: p.nombre }, attributes: ['id'], transaction });
          exigir(!homonimo, `Ya existe ${p.nombre} con otro SKU. Revisar antes de importar para no duplicarlo.`);
          let insumoId = null;
          if (p.directo) {
            const [insumo, creado] = await InsumoAlmacen.findOrCreate({ where: { codigo: p.sku },
              defaults: { nombre: p.nombre, unidad_medida_id: unidad.id, activo: true, perecible: false }, transaction });
            insumoId = insumo.id;
            if (creado) cambios.insumos++;
          }
          const valores = { nombre: p.nombre, categoria_id: categoriaIds[p.categoria], precio_venta_base: p.precio,
            descripcion: p.descripcion || null, imagen_url: imagenes[p.imagen].url, sku: p.sku,
            tipo_producto: p.directo ? 'producto_directo' : 'plato_preparado',
            controla_stock: Boolean(p.directo), insumo_directo_id: insumoId, estado: 'activo' };
          exigir(validarProducto(valores), `Producto inválido: ${p.sku}`);
          // Lista explícita: nunca asignar márgenes calculados, costos o saldos.
          producto = await ProductoVenta.create(valores, { fields: Object.keys(valores), transaction });
          cambios.productos++;
        }
        // Corrección autorizada de marcas/volumen, limitada a los SKU de bebidas
        // originales. No cambiar IDs, precios, saldos, estado ni vínculos históricos.
        if (process.argv.includes('--actualizar-bebidas') &&
            (p.sku.startsWith('CARTA-FRI-GAS-') || ['CARTA-FRI-AGUA', 'CARTA-FRI-AGUA-1L'].includes(p.sku))) {
          const valores = { nombre: p.nombre, descripcion: p.descripcion };
          if (producto.nombre !== p.nombre || producto.descripcion !== p.descripcion) {
            correccionesBebidas.push({ id: producto.id, sku: p.sku,
              anterior: { nombre: producto.nombre, descripcion: producto.descripcion }, nuevo: valores });
            await producto.update(valores, { fields: Object.keys(valores), transaction });
            cambios.datosBebidas++;
          }
          // Solo renombrar el insumo propio de ese SKU, nunca un insumo compartido.
          if (producto.insumo_directo_id) {
            const insumo = await InsumoAlmacen.findOne({ where: { id: producto.insumo_directo_id, codigo: p.sku }, transaction });
            if (insumo && insumo.nombre !== p.nombre) await insumo.update({ nombre: p.nombre }, { fields: ['nombre'], transaction });
          }
        }
        // Actualizar exclusivamente fotos cuando se solicita expresamente.
        // Nunca cambiar precios, existencias ni otros datos ya editados.
        if (process.argv.includes('--actualizar-imagenes') && producto.imagen_url !== imagenes[p.imagen].url) {
          await producto.update({ imagen_url: imagenes[p.imagen].url }, { fields: ['imagen_url'], transaction });
          cambios.imagenes++;
        }
        for (const v of p.variantes ?? []) {
          const [, creada] = await VarianteProducto.findOrCreate({ where: { producto_id: producto.id, nombre_variante: v.nombre },
            defaults: { precio_adicional: decimal(centimos(v.precio) - centimos(p.precio)) }, transaction });
          if (creada) cambios.variantes++;
        }
        for (const clave of p.grupos ?? []) {
          const [, creado] = await ProductoModificador.findOrCreate({ where: { producto_id: producto.id, grupo_id: grupoIds[clave] }, transaction });
          if (creado) cambios.vinculos++;
        }
      }
      // La carta incluye delivery. Conservarlo como configuración de referencia,
      // sin crear productos ficticios ni implantar reglas de cobro de otra fase.
      const [, configuracionCreada] = await ConfiguracionGlobal.findOrCreate({ where: { parametro_key: 'CARTA_TARIFAS_DELIVERY' },
        defaults: { valor_json: { moneda: 'PEN', fuente: 'VENEZIANA CARTA.pdf, página 14', tarifas: tarifasDelivery },
          descripcion: 'Tarifas de referencia de la carta; no aplicadas automáticamente al pedido.' }, transaction });
      if (Object.values(cambios).some(Boolean) || configuracionCreada) {
        await AuditLog.create({ usuario_id: null, entidad_afectada: 'productos_venta', tipo_evento: correccionesBebidas.length ? 'UPDATE' : 'INSERT',
          datos_nuevos: { ...cambios, correccionesBebidas }, descripcion: 'Importación CLI autorizada de VENEZIANA CARTA.pdf. Sin saldos, recetas ni cobros inventados.' }, { transaction });
      }
      return cambios;
    });
    console.log('Importación confirmada:', JSON.stringify(resultado));
  } else console.log('Sin escrituras. Ejecutar con --aplicar para registrar la carta.');

  // Créditos públicos: las licencias y los autores deben acompañar las fotos.
  const filas = Object.entries(imagenes).map(([clave, i]) => `<li><h2>${escape(clave)}</h2><p>${escape(i.autor)} · ${escape(i.licencia)}</p><p><a href="${escape(i.fuente)}">Fuente y autoría de la imagen</a> · <a href="${escape(i.licenciaUrl)}">Licencia</a></p><p>Imagen referencial, presentada en miniatura; no es fotografía del producto del local.</p></li>`).join('\n');
  await writeFile(new URL('../../frontend/public/creditos-imagenes-carta.html', import.meta.url),
    `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Créditos de imágenes - La Veneziana</title><style>body{font:16px/1.6 system-ui;max-width:850px;margin:40px auto;padding:0 20px;color:#243446}a{color:#844600}li{border-bottom:1px solid #ddd;padding:10px 0;overflow-wrap:anywhere}h2{font-size:19px}</style><h1>Imágenes referenciales de la carta</h1><p>Fotografías de Wikimedia Commons y páginas de marcas/distribuidores. Cada fuente conserva sus derechos y condiciones. No representan las preparaciones reales de La Veneziana. Créditos y licencias:</p><ul>${filas}</ul></html>`);
  const filasDelivery = tarifasDelivery.map(t => `<tr><td>${escape(t.zona)}</td><td>S/ ${t.importe}</td></tr>`).join('');
  await writeFile(new URL('../../frontend/public/tarifas-delivery-carta.html', import.meta.url),
    `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Delivery - La Veneziana</title><style>body{font:16px/1.6 system-ui;max-width:700px;margin:40px auto;padding:0 20px;color:#243446}table{width:100%;border-collapse:collapse}td,th{padding:12px;text-align:left;border-bottom:1px solid #ddd}th{background:#fff3ce}h1{color:#9b332b}</style><h1>Tarifas de delivery</h1><p>Tarifas de referencia de la carta de La Veneziana. No se añaden automáticamente al borrador del pedido.</p><table><thead><tr><th>Zona</th><th>Tarifa</th></tr></thead><tbody>${filasDelivery}</tbody></table></html>`);
} finally { await sequelize.close(); }
