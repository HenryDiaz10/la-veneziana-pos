import {writeFile} from 'node:fs/promises';
import {sequelize} from '../src/config/database.js';
import {env} from '../src/config/env.js';
import {cargarComprasIniciales} from '../src/services/compras-iniciales.service.js';
import {lineasComprasIniciales} from '../data/compras-iniciales.mjs';
import {verificarMargenesIniciales} from '../src/services/compras-iniciales-margen.js';
try {
  if(env.entorno==='production'||!['localhost','127.0.0.1','::1'].includes(env.database.host))throw Error('Carga limitada al desarrollo local.');
  if(process.argv.slice(2).some(a=>a!=='--aplicar'))throw Error('Uso: node scripts/cargar-compras-iniciales.mjs [--aplicar]');
  const margenes=await verificarMargenesIniciales();
  const resultado=await cargarComprasIniciales({aplicar:process.argv.includes('--aplicar')});
  const filas=[['Insumo','Código','Unidad base','Cantidad','Costo neto unitario S/','RUC proveedor','Origen'],...lineasComprasIniciales.map(l=>[l.nombre,l.codigo,l.unidad,l.cantidad_base,l.costo_unitario,l.ruc,'Estimación autorizada; documento interno'])];
  await writeFile(new URL('../data/compras-iniciales.csv',import.meta.url),'\uFEFF'+filas.map(f=>f.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n'),'utf8');
  await writeFile(new URL('../data/margenes-abastecimiento.csv',import.meta.url),'\uFEFF'+[['SKU','Producto','Presentación','Venta con opciones S/','Costo insumos con IGV S/','Aporte conservador S/ (sin gastos operativos)'],...margenes.map(m=>[m.sku,m.producto,m.presentacion,m.venta,m.costo_con_igv,m.aporte_conservador])].map(f=>f.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n'),'utf8');
  resultado.presentaciones_con_margen=margenes.length;
  console.log(JSON.stringify(resultado));
}catch(e){console.error('No se completó el abastecimiento:',e.name.startsWith('Sequelize')?'Error de base de datos. Sin confirmación del lote.':e.codigo??e.message);process.exitCode=1;}
finally{await sequelize.close();}
