// Registros temporales exclusivamente en MySQL local. La tasa de prueba solo
// vive en una transacción que se revierte: FINANZAS real nunca se modifica.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import * as m from '../src/models/index.js';
import { crearHashPassword } from '../src/security/password.js';
import { crearPedido, ampliarPedido, cambiarBloqueoPago } from '../src/services/pedidos.service.js';
import { abrirCaja } from '../src/services/caja.service.js';
import { cobrarPedido } from '../src/services/cobros.service.js';
import { recuperarOperacion } from '../src/services/operacion-comercial.js';
import { registrarMovimiento, consumirTarea } from '../src/services/inventario.service.js';
assert.ok(env.entorno !== 'production' && ['localhost','127.0.0.1','::1'].includes(env.database.host));
const marca = randomUUID(), usuarios=[], unidades=[], insumos=[], productos=[];
let categoria, cliente, caja, grupo, servidor, padre;
const ctx=(usuarioId=usuarios[0]?.id, transaction)=>({usuarioId, clave:randomUUID(), transaction, puedeCanjear:true});
const linea=(p,cantidad=1,modificadoresIds=[])=>({productoId:p.id,cantidad,modificadoresIds,indicaciones:'Sin cebolla'});
const llevar=lineas=>({tipo_atencion:'llevar',lineas});
const rechaza=(fn,codigo)=>assert.rejects(fn,e=>e.codigo===codigo,`Esperado ${codigo}`);
try {
  const clave=randomBytes(24).toString('hex'), hash=await crearHashPassword(clave);
  for(const nombre of ['administrador','cajero','cocinero']) {
    const rol=await m.Rol.findOne({where:{nombre}}); assert.ok(rol,`Falta rol ${nombre}`);
    usuarios.push(await m.Usuario.create({nombre_completo:'Prueba temporal F28',email:`f28-${nombre}-${marca}@example.invalid`,password_hash:hash,rol_id:rol.id,estado:'activo'}));
  }
  categoria=await m.CategoriaVenta.create({nombre:`F28 ${marca}`,slug:`f28-${marca}`,activa:true,es_para_kds:true});
  for(const ab of ['kg','un'])unidades.push(await m.UnidadMedida.create({nombre:`F28 ${marca} ${ab}`,abreviatura:ab}));
  for(let n=0;n<2;n++) {
    const i=await m.InsumoAlmacen.create({nombre:`F28 insumo ${n}`,codigo:`F28-${marca}-${n}`,unidad_medida_id:unidades[n].id,activo:true,perecible:false}); insumos.push(i);
    await registrarMovimiento({insumo_id:i.id,tipo_transaccion:'INGRESO_AJUSTE',cantidad:'20',costo_unitario:'1',operacion_uid:`mov:${randomUUID()}`,usuario_id:usuarios[0].id,referencia_documento:`fixture:${marca}`});
    productos.push(await m.ProductoVenta.create({nombre:`F28 producto ${n}`,categoria_id:categoria.id,precio_venta_base:'10.00',
      tipo_producto:n?'producto_directo':'plato_preparado',controla_stock:true,insumo_directo_id:n?i.id:null,estado:'activo'}));
  }
  await m.RecetaBom.create({producto_venta_id:productos[0].id,variante_id:null,insumo_id:insumos[0].id,cantidad_bruta_necesaria:'1.0000'});
  grupo=await m.ModificadorCatalogo.create({nombre_grupo:`F28 presa ${marca}`,es_multiple:false,es_obligatorio:true});
  const opciones=[];
  for(const nombre of ['Pecho','Pierna'])opciones.push(await m.ModificadorItem.create({grupo_id:grupo.id,nombre_modificador:nombre,precio_adicional:'0.00'}));
  await m.ProductoModificador.create({producto_id:productos[0].id,grupo_id:grupo.id});
  cliente=await m.Cliente.create({nombres:'Cliente temporal F28',puntos_vip_actuales:100,puntos_vip_historicos:100,estado:'activo'});
  caja=await m.CajaFisica.create({nombre_terminal:`F28 ${marca.slice(0,8)}`,estado:'activa'});
  const saldo=async n=>(await m.InsumoAlmacen.findByPk(insumos[n].id)).toJSON();
  // Atomicidad ante selección incompleta y falta de stock.
  await rechaza(()=>crearPedido(llevar([linea(productos[0])]),ctx()),'SELECCION_INCOMPLETA');
  await rechaza(()=>crearPedido(llevar([linea(productos[1],21)]),ctx()),'STOCK_INSUFICIENTE');
  assert.equal(await m.PedidoMaster.count({where:{usuario_creador_id:usuarios[0].id}}),0);
  const comando=llevar([linea(productos[0],1,[opciones[1].id]),linea(productos[1])]);
  const contexto=ctx();
  const originales=await Promise.all([crearPedido(comando,contexto),crearPedido(comando,contexto)]);
  assert.equal(originales[0].pedido.id,originales[1].pedido.id);
  assert.equal((await recuperarOperacion(usuarios[0].id,'pedido.crear',contexto.clave)).pedido.id,originales[0].pedido.id);
  await rechaza(()=>recuperarOperacion(usuarios[1].id,'pedido.crear',contexto.clave),'OPERACION_INEXISTENTE');
  let pedido=originales[0].pedido;
  assert.equal(pedido.total_preliminar,'20.00');
  assert.equal(pedido.lineas[0].indicaciones,'Sin cebolla');
  assert.equal(pedido.lineas[0].modificadores[0].nombre,'Pierna');
  assert.equal((await saldo(0)).stock_fisico,'20.0000');
  assert.equal((await saldo(0)).stock_reservado,'1.0000');
  assert.equal(await m.VentaComprobante.count({where:{pedido_id:pedido.id}}),0);
  assert.equal(await m.KdsTarea.count({where:{pedido_item_id:pedido.lineas.map(l=>l.id)}}),2);
  assert.equal(await m.EventoOutbox.count({where:{entidad:'pedidos_master',entidad_id:pedido.id,tipo:'pedido.cocina',sala_destino:'kds'}}),1);
  await rechaza(()=>crearPedido({...comando,notas_globales:'cambio'},contexto),'IDEMPOTENCIA_EN_CONFLICTO');
  await rechaza(()=>ampliarPedido(pedido.id,{version:99,lineas:[linea(productos[1])]},ctx()),'PEDIDO_DESACTUALIZADO');
  pedido=(await ampliarPedido(pedido.id,{version:pedido.version,lineas:[linea(productos[1])]},ctx())).pedido;
  assert.equal(pedido.total_preliminar,'30.00');
  assert.equal(pedido.version,2);
  pedido=(await cambiarBloqueoPago(pedido.id,{version:pedido.version},ctx())).pedido;
  await rechaza(()=>ampliarPedido(pedido.id,{version:pedido.version,lineas:[linea(productos[1])]},ctx()),'PEDIDO_NO_ABIERTO');
  await rechaza(()=>cambiarBloqueoPago(pedido.id,{version:pedido.version},ctx(usuarios[1].id),true),'BLOQUEO_NO_DISPONIBLE');
  pedido=(await cambiarBloqueoPago(pedido.id,{version:pedido.version},ctx(),true)).pedido;
  const aperturaContexto=ctx();
  const sesion=(await abrirCaja({caja_fisica_id:caja.id,apertura_monto_base:'50'},aperturaContexto)).sesion;
  assert.equal((await abrirCaja({caja_fisica_id:caja.id,apertura_monto_base:'50'},aperturaContexto)).sesion.id,sesion.id);
  await rechaza(()=>abrirCaja({caja_fisica_id:caja.id,apertura_monto_base:'0'},ctx(usuarios[1].id)),'CAJA_YA_ABIERTA');
  // HTTP real, permisos, CSRF y validación de entradas.
  servidor=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base=`http://127.0.0.1:${servidor.address().port}/api`;
  const pedir=async(ruta,method='GET',body,cookie,csrf=true,key=randomUUID())=>{
    const headers={'Content-Type':'application/json','Idempotency-Key':key};
    if(cookie)headers.Cookie=cookie;
    if(csrf){headers.Origin=env.origenFrontend;headers['X-CSRF-Protection']='1';}
    const r=await fetch(base+ruta,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    return {status:r.status,json:await r.json(),headers:r.headers};
  };
  const cookies=[];
  for(const u of usuarios){const r=await pedir('/auth/login','POST',{email:u.email,password:clave});assert.equal(r.status,200);cookies.push(r.headers.get('set-cookie').split(';')[0]);}
  assert.equal((await pedir('/pedidos/1')).status,401);
  assert.equal((await pedir('/pedidos','POST',comando,cookies[2])).status,403);
  assert.equal((await pedir('/pedidos','POST',comando,cookies[0],false)).status,403);
  assert.equal((await pedir('/pedidos','POST',{...comando,total:'1'},cookies[0])).status,400);
  const http=await pedir('/pedidos','POST',llevar([linea(productos[1])]),cookies[0]);
  assert.equal(http.status,201,JSON.stringify(http.json));
  assert.equal((await pedir(`/pedidos/${http.json.pedido.id}`,'GET',undefined,cookies[0])).status,200);
  const ventasAntes=await m.VentaComprobante.count({where:{cajero_id:usuarios[0].id}});
  const operacionesAntes=await m.IdempotenciaOperacion.count({where:{usuario_id:usuarios[0].id}});
  const contextoHttp=await pedir(`/pedidos/${http.json.pedido.id}/contexto-pago`,'GET',undefined,cookies[0]);
  assert.equal(contextoHttp.status,200);assert.equal(contextoHttp.json.pedido.total,'10.00');
  assert.equal(contextoHttp.json.sesion_caja.id,sesion.id);
  assert.equal(typeof contextoHttp.json.finanzas_habilitadas,'boolean');
  assert.equal((await pedir(`/pedidos/${http.json.pedido.id}/contexto-pago`,'GET',undefined,cookies[2])).status,403);
  assert.equal(await m.VentaComprobante.count({where:{cajero_id:usuarios[0].id}}),ventasAntes);
  assert.equal(await m.IdempotenciaOperacion.count({where:{usuario_id:usuarios[0].id}}),operacionesAntes);
  const temporal=(await cambiarBloqueoPago(pedido.id,{version:pedido.version},ctx())).pedido;
  await m.PedidoMaster.update({bloqueo_hasta:new Date(Date.now()-1000)},{where:{id:pedido.id}});
  const desbloqueado=await pedir(`/pedidos/${pedido.id}`,'GET',undefined,cookies[0]);
  assert.equal(desbloqueado.json.pedido.estado_cuenta,'abierta');
  assert.equal(desbloqueado.json.pedido.version,temporal.version+1);
  // Política fiscal ficticia SOLO dentro de una transacción no confirmada.
  padre=await sequelize.transaction();
  const [finanzas]=await m.ConfiguracionGlobal.findOrCreate({where:{parametro_key:'FINANZAS'},defaults:{valor_json:{}},transaction:padre});
  await finanzas.update({valor_json:{igv_porcentaje:null,precios_incluyen_impuesto:true}},{transaction:padre});
  let comercial=(await crearPedido({...llevar([linea(productos[1])]),cliente_id:cliente.id},ctx(usuarios[0].id,padre))).pedido;
  comercial=(await cambiarBloqueoPago(comercial.id,{version:comercial.version},ctx(usuarios[0].id,padre))).pedido;
  const cobrar={version:comercial.version,sesion_caja_id:sesion.id,pagos:[{metodo_pago:'yape',monto_pagado:'4',referencia_operacion:'TEST-VERIFICADO',verificado:true},{metodo_pago:'efectivo',monto_pagado:'6',monto_entregado:'10'}]};
  await rechaza(()=>cobrarPedido(comercial.id,cobrar,ctx(usuarios[0].id,padre)),'FINANZAS_PENDIENTES');
  assert.equal(await m.VentaComprobante.count({where:{pedido_id:comercial.id},transaction:padre}),0);
  await finanzas.update({valor_json:{igv_porcentaje:'18.00',precios_incluyen_impuesto:true,puntos_vip_modo:'por_sol',puntos_vip_por_sol:1,valor_punto_pen:'0.10'}},{transaction:padre});
  const antes=await m.InsumoAlmacen.findByPk(insumos[1].id,{transaction:padre});
  await rechaza(()=>cobrarPedido(comercial.id,cobrar,ctx(usuarios[1].id,padre)),'SESION_CAJA_NO_DISPONIBLE');
  const operacion=ctx(usuarios[0].id,padre), cobrado=await cobrarPedido(comercial.id,cobrar,operacion);
  assert.equal(cobrado.venta.total,'10.00');assert.equal(cobrado.venta.impuesto,'1.53');assert.equal(cobrado.venta.pagos[1].vuelto,'4.00');
  assert.equal((await cobrarPedido(comercial.id,cobrar,operacion)).venta.id,cobrado.venta.id);
  assert.equal(await m.VentaComprobante.count({where:{pedido_id:comercial.id},transaction:padre}),1);
  assert.equal((await m.Cliente.findByPk(cliente.id,{transaction:padre})).puntos_vip_actuales,110);
  const despues=await m.InsumoAlmacen.findByPk(insumos[1].id,{transaction:padre});
  assert.equal(despues.stock_fisico,antes.stock_fisico);assert.equal(despues.stock_reservado,antes.stock_reservado);
  await rechaza(()=>ampliarPedido(comercial.id,{version:cobrado.pedido.version,lineas:[linea(productos[1])]},ctx(usuarios[0].id,padre)),'PEDIDO_NO_ABIERTO');
  await rechaza(()=>cobrarPedido(comercial.id,cobrar,ctx(usuarios[0].id,padre)),'PEDIDO_DESACTUALIZADO');
  // Fallo tardío en auditoría revierte la venta, pagos, puntos y estado juntos.
  let fallido=(await crearPedido(llevar([linea(productos[1])]),ctx(usuarios[0].id,padre))).pedido;
  fallido=(await cambiarBloqueoPago(fallido.id,{version:fallido.version},ctx(usuarios[0].id,padre))).pedido;
  const hook=`f28-${marca}`;
  m.AuditLog.addHook('beforeCreate',hook,()=>{throw new Error('fallo controlado');});
  try {await assert.rejects(()=>cobrarPedido(fallido.id,{...cobrar,version:fallido.version},ctx(usuarios[0].id,padre)),/fallo controlado/);}
  finally {m.AuditLog.removeHook('beforeCreate',hook);}
  assert.equal(await m.VentaComprobante.count({where:{pedido_id:fallido.id},transaction:padre}),0);
  assert.equal((await m.PedidoMaster.findByPk(fallido.id,{transaction:padre})).estado_cuenta,'bloqueada_en_pago');
  // Canje como pago: no volver a descontarlo y ganar solo sobre el efectivo.
  let canje=(await crearPedido({...llevar([linea(productos[1])]),cliente_id:cliente.id},ctx(usuarios[0].id,padre))).pedido;
  canje=(await cambiarBloqueoPago(canje.id,{version:canje.version},ctx(usuarios[0].id,padre))).pedido;
  const pagoCanje={version:canje.version,sesion_caja_id:sesion.id,pagos:[{metodo_pago:'puntos_vip',monto_pagado:'2.00',puntos:20},{metodo_pago:'efectivo',monto_pagado:'8',monto_entregado:'8'}]};
  await rechaza(()=>cobrarPedido(canje.id,pagoCanje,{...ctx(usuarios[0].id,padre),puedeCanjear:false}),'CANJE_NO_AUTORIZADO');
  const c=await cobrarPedido(canje.id,pagoCanje,ctx(usuarios[0].id,padre));
  assert.equal(c.venta.fidelizacion.puntos_ganados,8);
  assert.equal((await m.Cliente.findByPk(cliente.id,{transaction:padre})).puntos_vip_actuales,98);
  assert.equal(await m.CrmMovimientoPuntos.count({where:{cliente_id:cliente.id},transaction:padre}),3);
  await padre.rollback();padre=null;
  // Dos usuarios compiten por el último disponible: solo uno puede reservar.
  const competencia=await Promise.allSettled([crearPedido(llevar([linea(productos[1],10)]),ctx()),crearPedido(llevar([linea(productos[1],10)]),ctx(usuarios[1].id))]);
  assert.equal(competencia.filter(r=>r.status==='fulfilled').length,1);
  assert.ok(competencia.some(r=>r.status==='rejected'&&r.reason.codigo==='STOCK_INSUFICIENTE'));
  // Consumir una tarea es una operación distinta del cobro y es idempotente.
  const tarea=await m.KdsTarea.findOne({include:[],where:{producto_id:productos[0].id}});
  await consumirTarea(tarea.id,{usuarioId:usuarios[0].id});
  await consumirTarea(tarea.id,{usuarioId:usuarios[0].id});
  assert.equal((await saldo(0)).stock_fisico,'19.0000');
  assert.equal(await m.InventarioKardex.count({where:{referencia_documento:`tarea:${tarea.id}`}}),1);
  console.log('OK fase 28: HTTP/CSRF/permisos, recetas/notas, reserva atómica, idempotencia concurrente, versiones, bloqueo, caja única, pagos separados, fiscal pendiente, puntos, rollback tardío y consumo independiente.');
} finally {
  if(padre&&!padre.finished)await padre.rollback();
  if(servidor)await new Promise(resolve=>servidor.close(resolve));
  const uids=usuarios.map(u=>u.id), pids=productos.map(p=>p.id), iids=insumos.map(i=>i.id);
  const pedidos=await m.PedidoMaster.findAll({where:{usuario_creador_id:uids.length?uids:[0]},attributes:['id']});
  const ids=pedidos.map(p=>p.id), items=ids.length?await m.PedidoItemKds.findAll({where:{pedido_id:ids},attributes:['id']}):[], itemIds=items.map(i=>i.id);
  if(itemIds.length){const tareas=await m.KdsTarea.findAll({where:{pedido_item_id:itemIds},attributes:['id']});const tids=tareas.map(t=>t.id);
    if(tids.length){await m.ReservaInsumo.destroy({where:{tarea_id:tids}});await m.KdsHistorial.destroy({where:{tarea_id:tids}});}
    await m.KdsTarea.destroy({where:{pedido_item_id:itemIds}});await m.PedidoItemModificador.destroy({where:{pedido_item_id:itemIds}});await m.PedidoItemKds.destroy({where:{id:itemIds}});}
  if(ids.length){await m.EventoOutbox.destroy({where:{entidad:'pedidos_master',entidad_id:ids}});await m.PedidoMaster.destroy({where:{id:ids}});}
  if(iids.length){await m.InventarioKardex.destroy({where:{insumo_id:iids}});}
  if(pids.length){await m.ProductoModificador.destroy({where:{producto_id:pids}});await m.RecetaBom.destroy({where:{producto_venta_id:pids}});await m.ProductoVenta.destroy({where:{id:pids}});}
  if(grupo){await m.ModificadorItem.destroy({where:{grupo_id:grupo.id}});await grupo.destroy();}
  if(iids.length)await m.InsumoAlmacen.destroy({where:{id:iids}});
  for(const u of unidades)await u.destroy();
  if(categoria)await categoria.destroy();if(cliente)await cliente.destroy();
  if(uids.length){await m.AuditLog.destroy({where:{usuario_id:uids}});await m.IdempotenciaOperacion.destroy({where:{usuario_id:uids}});await m.AuthSesion.destroy({where:{usuario_id:uids}});await m.SesionCajaZ.destroy({where:{cajero_id:uids}});}
  if(caja)await caja.destroy();
  if(uids.length)await m.Usuario.destroy({where:{id:uids}});
  await sequelize.close();
}
