import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {env} from '../src/config/env.js';
import {sequelize} from '../src/config/database.js';
import * as m from '../src/models/index.js';
import {crearHashPassword} from '../src/security/password.js';
import {consultarGerencial} from '../src/services/reportes.service.js';
assert.ok(env.entorno!=='production'&&['127.0.0.1','localhost','::1'].includes(env.database.host),'Solo MySQL local.');
const tag='RC'+randomUUID().slice(0,8),tx=await sequelize.transaction();
try{
 const op={transaction:tx},rol=await m.Rol.findOne({where:{nombre:'cajero'},...op});
 const usuario=await m.Usuario.create({nombre_completo:tag,email:`${tag}@example.invalid`,password_hash:await crearHashPassword(randomBytes(20).toString('hex')),rol_id:rol.id,estado:'activo'},op);
 const caja=await m.CajaFisica.create({nombre_terminal:tag,estado:'activa'},op);
 const sesion=await m.SesionCajaZ.create({caja_fisica_id:caja.id,cajero_id:usuario.id,apertura_monto_base:'100.00',estado_sesion:'abierta'},op);
 const clientes=[];
 for(const nombre of ['Ana actual','Luis actual','Solo anulada','Sin compras'])clientes.push(await m.Cliente.create({nombres:nombre,tipo_documento:'PASAPORTE',numero_documento:`${tag}${clientes.length}`,telefono_principal:'987654321'},op));
 const categoria=await m.CategoriaVenta.create({nombre:tag,slug:tag.toLowerCase(),activa:true},op);
 const producto=await m.ProductoVenta.create({nombre:'Producto actual',categoria_id:categoria.id,precio_venta_base:'50.00',tipo_producto:'plato_preparado',estado:'activo'},op);
 let numero=0;
 async function vender(cliente,total,cantidad,precio,fecha,estado='emitida'){
  const pedido=await m.PedidoMaster.create({codigo_pedido:`${tag}-P${++numero}`,tipo_atencion:'llevar',cliente_id:cliente?.id??null,usuario_creador_id:usuario.id,estado_cuenta:'pagada',snapshot_cliente_json:cliente?{id:cliente.id,nombre:cliente.nombres}:null},op);
  const item=await m.PedidoItemKds.create({pedido_id:pedido.id,producto_venta_id:producto.id,cantidad,precio_unitario_grabado:precio,subtotal_item:total,snapshot_item_json:{nombre:'Pizza histórica',modificadores:[]}},op);
  const venta=await m.VentaComprobante.create({pedido_id:pedido.id,sesion_caja_id:sesion.id,cajero_id:usuario.id,serie_correlativo:`${tag}-${numero}`,subtotal_gravado:total,igv_total:'0.00',total_final_venta:total,estado_emision:estado,fecha_emision:new Date(fecha),snapshot_fiscal_json:{cliente:cliente?{id:cliente.id,nombre:cliente.nombres}:null},operacion_uid:randomUUID()},op);
  await m.VentaDetalleSnapshot.create({venta_id:venta.id,pedido_item_id:item.id,descripcion_snapshot:'Pizza histórica',cantidad,precio_unitario:precio,base_imponible:total,impuesto:'0.00',total,snapshot_json:{nombre:'Pizza histórica'}},op);
  await m.VentaPagoSplit.create({venta_id:venta.id,metodo_pago:'efectivo',monto_pagado:total},op);
  return venta;
 }
 await vender(clientes[0],'30.00',1,'30.00','2025-12-01T18:00:00Z');
 const mixta=await vender(clientes[0],'100.00',2,'50.00','2026-01-02T04:59:59Z');
 await m.VentaPagoSplit.update({monto_pagado:'60.00'},{where:{venta_id:mixta.id},...op});
 await m.VentaPagoSplit.create({venta_id:mixta.id,metodo_pago:'yape',monto_pagado:'40.00'},op);
 await vender(clientes[0],'40.00',1,'40.00','2026-01-02T05:00:00Z');
 await vender(clientes[1],'60.00',5,'12.00','2026-01-01T20:00:00Z');
 await vender(null,'20.00',1,'20.00','2026-01-02T06:00:00Z');
 await vender(clientes[2],'1000.00',10,'100.00','2026-01-01T18:00:00Z','anulada');
 await m.VentaDevolucion.create({venta_id:mixta.id,usuario_id:usuario.id,autorizador_id:usuario.id,motivo:'Prueba',total:'10.00',operacion_uid:randomUUID()},op);
 const filtros={desde:'2026-01-01',hasta:'2026-01-02',sesion_id:String(sesion.id),estado:'todos'};
 const r=(await consultarGerencial(filtros,tx)).clientes;
 assert.deepEqual(r.resumen,{activos:2,nuevos:1,regresaron:1,recurrentes:1,una_compra:1,compras_identificadas:3,compras_sin_cliente:1,ingreso_neto:'190.00',ingreso_sin_cliente:'20.00',recompra_porcentaje:'50.00',identificacion_porcentaje:'75.00',compras_por_cliente:'1.50'});
 assert.equal(r.ranking_ingresos[0].id,clientes[0].id);assert.equal(r.ranking_ingresos[0].neto,'130.00');assert.equal(r.ranking_ingresos[0].promedio_neto,'65.00');assert.equal(r.ranking_ingresos[0].nuevo,false);
 assert.equal(r.ranking_frecuencia[0].compras,2);assert.equal(r.ranking_unidades[0].id,clientes[1].id);assert.equal(r.ranking_unidades[0].unidades,'5');assert.equal(r.productos[0].unidades,'8');
 assert.deepEqual(r.evolucion.map(e=>[e.fecha,e.clientes]),[['2026-01-01',2],['2026-01-02',1]]);
 assert.equal((await consultarGerencial({...filtros,hasta:'2026-04-03'},tx)).clientes.granularidad,'mes');
 const vacio=(await consultarGerencial({...filtros,estado:'anulada'},tx)).clientes;assert.equal(vacio.resumen.activos,0);assert.equal(vacio.resumen.ingreso_neto,'0.00');
 assert.equal((await consultarGerencial({...filtros,canal:'salon'},tx)).clientes.resumen.compras_sin_cliente,0);
 console.log('OK: clientes reales por ID, nuevos históricos, recompra, frecuencia, netos/devoluciones, mixtos sin duplicados, unidades, anonimato, fechas Lima, periodos largos y filtros. Rollback total.');
}finally{await tx.rollback();await sequelize.close();}
