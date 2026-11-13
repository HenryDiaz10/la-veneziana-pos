// Ejecuta las altas y confirmaciones reales dentro de una transacción revertida.
// No deja compras, stock, cuentas ni gastos de prueba en la base del usuario.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {env} from '../src/config/env.js';
import {sequelize} from '../src/config/database.js';
import * as m from '../src/models/index.js';
import {guardarCompra,confirmarCompra} from '../src/services/compras.service.js';
import {consultarGerencial} from '../src/services/reportes.service.js';
const marca=randomUUID();let tx;
try{
  assert.notEqual(env.entorno,'production');assert.ok(['localhost','127.0.0.1','::1'].includes(env.database.host));
  tx=await sequelize.transaction();
  const actor=await m.Usuario.findOne({where:{estado:'activo'},transaction:tx});assert.ok(actor);
  const proveedor=await m.ProveedorMaestro.create({razon_social:`Prueba reportes ${marca}`,ruc:`20${String(BigInt('0x'+marca.replaceAll('-','').slice(0,12))%1000000000n).padStart(9,'0')}`,estado:'activo'},{transaction:tx});
  const unidad=await m.UnidadMedida.create({nombre:`Unidad prueba ${marca}`,abreviatura:'un'},{transaction:tx});
  const insumos=[];for(let n=0;n<2;n++)insumos.push(await m.InsumoAlmacen.create({codigo:`REP-${n}-${marca}`,nombre:`Prueba reportes ${n}`,unidad_medida_id:unidad.id,activo:true,perecible:false},{transaction:tx}));
  const q={desde:'2026-11-01',hasta:'2026-11-30'},antes=await consultarGerencial(q,tx);
  const sumar=(a,b)=>(BigInt(a.replace('.',''))+BigInt(b.replace('.',''))).toString();
  const entrada={proveedor_id:proveedor.id,numero_factura:`TEST-${marca.slice(0,12)}`,fecha_emision:'2026-11-13',igv:'18.00',operacion_uid:`compra:${randomUUID()}`,lineas:insumos.map(i=>({insumo_id:i.id,cantidad_base:'5',costo_unitario:'10'}))};
  let {compra}=await guardarCompra(null,entrada,actor.id,{transaction:tx});assert.equal(compra.total,'118.00');
  let r=await consultarGerencial(q,tx);assert.equal(r.compras.total,antes.compras.total);assert.equal(r.actividad_financiera.borradores.cantidad,antes.actividad_financiera.borradores.cantidad+1);
  await confirmarCompra(compra.id,{revision:compra.revision},actor.id,{transaction:tx});
  r=await consultarGerencial(q,tx);assert.equal(r.compras.cantidad,antes.compras.cantidad+1);assert.equal(r.compras.total.replace('.',''),sumar(antes.compras.total,'118.00'));
  assert.equal(r.actividad_financiera.proveedores.find(p=>p.proveedor_id===proveedor.id).total,'118.00','Dos líneas no multiplican el importe de cabecera');
  assert.equal(r.actividad_financiera.compras_documentos.find(c=>c.id===compra.id).total,'118.00');
  const dia=r.actividad_financiera.compras_por_dia.find(d=>d.fecha==='2026-11-13');assert.ok(dia);
  assert.equal(dia.total.replace('.',''),sumar(antes.actividad_financiera.compras_por_dia.find(d=>d.fecha==='2026-11-13')?.total??'0.00','118.00'));
  assert.equal(r.compras.pendientes_sin_abonos.replace('.',''),sumar(antes.compras.pendientes_sin_abonos,'118.00'));
  await m.CompraFactura.update({estado_pago:'pagado_total'},{where:{id:compra.id},transaction:tx});
  r=await consultarGerencial(q,tx);assert.equal(r.compras.saldadas.replace('.',''),sumar(antes.compras.saldadas,'118.00'));assert.equal(r.compras.pendientes_sin_abonos,antes.compras.pendientes_sin_abonos);
  assert.equal(r.actividad_financiera.compras_documentos.find(c=>c.id===compra.id).estado_pago,'pagado_total');
  const filtrado=await consultarGerencial({...q,canal:'delivery',sesion_id:'2147483647'},tx);assert.equal(filtrado.compras.total,r.compras.total,'Compras globales no desaparecen al filtrar ventas');
  const fuera=await consultarGerencial({desde:'2026-11-14',hasta:'2026-11-14'},tx);assert.ok(!fuera.actividad_financiera.compras_documentos.some(c=>c.id===compra.id));
  // El abastecimiento no se convierte en gasto ni se descuenta otra vez del margen.
  assert.equal(r.gastos.total,antes.gastos.total);assert.equal(r.estimacion.resultado_tras_gastos,antes.estimacion.resultado_tras_gastos);
  assert.equal((await m.InsumoAlmacen.findByPk(insumos[0].id,{transaction:tx})).stock_fisico,'5.0000');
  console.log('OK: compra real de dos líneas, borrador excluido y visible como aviso, confirmación/stock, total con IGV, serie diaria, proveedor/documento, pago, filtros y utilidad sin doble descuento. Todo revertido.');
}finally{if(tx&&!tx.finished)await tx.rollback();await sequelize.close();}
