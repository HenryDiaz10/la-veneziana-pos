import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import app from '../src/app.js';
import {env} from '../src/config/env.js';
import {sequelize} from '../src/config/database.js';
import * as m from '../src/models/index.js';
import {crearHashPassword} from '../src/security/password.js';
import {listarHistorialVentas,consultarVentaHistorial,filtrosHistorial} from '../src/services/historial-ventas.service.js';
assert.ok(env.entorno!=='production'&&['127.0.0.1','localhost','::1'].includes(env.database.host),'Solo prueba local.');
const usuarios=[],tag='HV'+randomUUID().slice(0,8);let tx,servidor;
try{
 const password=randomBytes(24).toString('hex'),hash=await crearHashPassword(password);
 for(const nombre of ['administrador','cajero','mesero','cocinero']){
  const rol=await m.Rol.findOne({where:{nombre}});
  usuarios.push(await m.Usuario.create({nombre_completo:`Prueba ${tag}`,email:`${tag}-${nombre}@example.invalid`,password_hash:hash,rol_id:rol.id,estado:'activo'}));
 }
 for(const invalido of [{desde:'2026-02-30'}, {pagina:'0'},{limite:'51'},{medio:'bitcoin'},{estado:'falso'},{busqueda:'x'.repeat(151)},{busqueda:['a','b']},{extra:'a'},{hasta:'2028-01-01'}])assert.throws(()=>filtrosHistorial({desde:'2026-01-01',hasta:'2026-01-02',...invalido}));
 tx=await sequelize.transaction();
 const op={transaction:tx};
 const caja=await m.CajaFisica.create({nombre_terminal:tag,estado:'activa'},op);
 const sesion=await m.SesionCajaZ.create({caja_fisica_id:caja.id,cajero_id:usuarios[1].id,apertura_monto_base:'100.00',estado_sesion:'abierta'},op);
 const cliente=await m.Cliente.create({nombres:'Nombre actual',tipo_documento:'PASAPORTE',numero_documento:tag,telefono_principal:'987654321'},op);
 const categoria=await m.CategoriaVenta.create({nombre:tag,slug:tag.toLowerCase(),activa:true},op);
 const producto=await m.ProductoVenta.create({nombre:'Producto actual',categoria_id:categoria.id,precio_venta_base:'50.00',tipo_producto:'plato_preparado',estado:'activo'},op);
 async function venta(i,total,estado,fecha,conCliente=false){
  const snapshot=conCliente?{id:cliente.id,nombre:'Nombre histórico %_',telefono:'987654321'}:null;
  const pedido=await m.PedidoMaster.create({codigo_pedido:`${tag}-P${i}`,tipo_atencion:'llevar',usuario_creador_id:usuarios[2].id,cliente_id:conCliente?cliente.id:null,estado_cuenta:'pagada',snapshot_cliente_json:snapshot},op);
  const item=await m.PedidoItemKds.create({pedido_id:pedido.id,producto_venta_id:producto.id,cantidad:1,precio_unitario_grabado:total,subtotal_item:total,snapshot_item_json:{nombre:'Nombre de producto vendido',modificadores:[]}},op);
  const v=await m.VentaComprobante.create({pedido_id:pedido.id,sesion_caja_id:sesion.id,cajero_id:usuarios[1].id,tipo_documento_fiscal:'ticket_interno',serie_correlativo:`${tag}-${i}`,subtotal_gravado:total,igv_total:'0.00',total_final_venta:total,estado_emision:estado,fecha_emision:new Date(fecha),snapshot_fiscal_json:{cliente:snapshot},operacion_uid:randomUUID()},op);
  await m.VentaDetalleSnapshot.create({venta_id:v.id,pedido_item_id:item.id,descripcion_snapshot:'Nombre de producto vendido',cantidad:1,precio_unitario:total,base_imponible:total,impuesto:'0.00',total,snapshot_json:{variante:'Familiar',modificadores:[{nombre:'Queso extra'}],indicaciones:'Sin sal'}},op);
  return v;
 }
 const primera=await venta(1,'100.00','emitida','2026-01-02T04:59:59Z',true);
 const anulada=await venta(2,'50.00','anulada','2026-01-02T05:00:00Z');
 const rechazada=await venta(3,'20.00','rechazada_sunat','2026-01-02T06:00:00Z');
 await m.VentaPagoSplit.bulkCreate([{venta_id:primera.id,metodo_pago:'efectivo',monto_pagado:'60.00',monto_entregado:'70.00',vuelto:'10.00'},{venta_id:primera.id,metodo_pago:'yape',monto_pagado:'40.00'},{venta_id:anulada.id,metodo_pago:'efectivo',monto_pagado:'50.00'},{venta_id:rechazada.id,metodo_pago:'yape',monto_pagado:'20.00'}],op);
 await m.VentaDevolucion.create({venta_id:primera.id,usuario_id:usuarios[1].id,autorizador_id:usuarios[0].id,motivo:'Prueba devolución',total:'10.00',operacion_uid:randomUUID()},op);
 const filtros={desde:'2026-01-01',hasta:'2026-01-02',busqueda:tag};
 const r=await listarHistorialVentas({...filtros,limite:'2'},tx);
 assert.equal(r.paginacion.total,3);assert.equal(r.ventas.length,2);assert.equal(r.resumen.total,'120.00');assert.equal(r.resumen.devuelto,'10.00');assert.equal(r.resumen.neto,'110.00');
 assert.equal((await listarHistorialVentas({...filtros,pagina:'2',limite:'2'},tx)).ventas[0].id,String(primera.id));
 const mixtas=await listarHistorialVentas({...filtros,estado:'emitida',medio:'yape'},tx);
 assert.equal(mixtas.ventas.length,1);assert.equal(mixtas.resumen.total,'100.00');assert.equal(mixtas.ventas[0].pagos.length,2);
 assert.equal((await listarHistorialVentas({...filtros,hasta:'2026-01-01'},tx)).resumen.cantidad,1);
 assert.equal((await listarHistorialVentas({...filtros,canal:'salon'},tx)).resumen.cantidad,0);
 assert.equal((await listarHistorialVentas({...filtros,busqueda:'%_'},tx)).resumen.cantidad,1); // comodines literales
 assert.equal((await listarHistorialVentas({...filtros,busqueda:"' OR 1=1 --"},tx)).resumen.cantidad,0);
 const detalle=await consultarVentaHistorial(String(primera.id),tx);
 assert.equal(detalle.venta.cliente.nombre,'Nombre histórico %_');assert.equal(detalle.venta.lineas[0].descripcion,'Nombre de producto vendido');assert.equal(detalle.venta.lineas[0].variante,'Familiar');assert.deepEqual(detalle.venta.lineas[0].modificadores,['Queso extra']);assert.equal(detalle.venta.lineas[0].indicaciones,'Sin sal');assert.equal(detalle.venta.devoluciones.length,1);
 assert.equal((await consultarVentaHistorial(String(anulada.id),tx)).venta.cliente.nombre,'Cliente no registrado');
 await tx.rollback();tx=null;
 servidor=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const base=`http://127.0.0.1:${servidor.address().port}/api`;
 assert.equal((await fetch(base+'/reportes/ventas')).status,401);
 for(const [i,u] of usuarios.entries()){
  const login=await fetch(base+'/auth/login',{method:'POST',headers:{Origin:env.origenFrontend,'X-CSRF-Protection':'1','Content-Type':'application/json'},body:JSON.stringify({email:u.email,password})});assert.equal(login.status,200);
  const headers={Cookie:login.headers.get('set-cookie').split(';')[0]};
  const res=await fetch(base+`/reportes/ventas?desde=2026-01-01&hasta=2026-01-02&busqueda=${tag}`,{headers});assert.equal(res.status,i===0?200:403);
  if(i===0){assert.equal((await res.json()).ventas.length,0);assert.equal((await fetch(base+'/reportes/ventas?desde=2026-01-01&hasta=2026-01-02&limite=99',{headers})).status,400);assert.equal((await fetch(base+'/reportes/ventas/0',{headers})).status,400);}
 }
 console.log('OK: fechas Lima, mixtos sin duplicados, totales exactos, anuladas, devoluciones, filtros literales, paginación, snapshots, 401/403 y validaciones. Fixtures revertidas.');
}finally{
 if(tx)await tx.rollback();if(servidor)await new Promise(r=>servidor.close(r));
 for(const u of usuarios){await m.AuthSesion.destroy({where:{usuario_id:u.id}});await u.destroy();}
 await sequelize.close();
}
