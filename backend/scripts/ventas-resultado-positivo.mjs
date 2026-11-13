// Ventas de demostración persistentes autorizadas. Calcula primero el margen
// con precios/recetas/costos existentes; nunca cambia precios, gastos o stock
// para forzar el resultado. Preparación, cobro y consumo usan servicios del POS.
import assert from 'node:assert/strict';
import {randomInt} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {Op} from 'sequelize';
import {env} from '../src/config/env.js';
import {sequelize} from '../src/config/database.js';
import * as m from '../src/models/index.js';
import {resolverReceta} from '../src/services/recetas.service.js';
import {crearPedido,cambiarBloqueoPago} from '../src/services/pedidos.service.js';
import {cobrarPedido} from '../src/services/cobros.service.js';
import {cambiarTareaKds} from '../src/services/kds-comandos.service.js';
import {cambiarMesa,marcaMesa} from '../src/services/mesas.service.js';
import {revisionMesa} from '../src/services/mesas-reglas.js';
import {auditoriaComercial} from '../src/services/operacion-comercial.js';
import {consultarGerencial} from '../src/services/reportes.service.js';
import {centimos,dinero,desglosarImpuesto,politicaFinanciera} from '../src/services/pedidos-calculo.js';
import {decimalInventario as decimal,costoTotalConsumo} from '../src/services/inventario-calculo.js';
import {decimalReporte as valor,formatoReporte} from '../src/services/reportes-reglas.js';
import {listarInventario} from '../src/services/inventario-consulta.service.js';

const lote='ventas-resultado-positivo-20261113',fecha=new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});
const elegir=xs=>xs[randomInt(xs.length)];
const carpeta=new URL('../../../DOCUMENTACION/REGISTROS/',import.meta.url),archivo=new URL(`${lote}.json`,carpeta);
async function verificar(){
 const datos=JSON.parse(await readFile(archivo,'utf8')),ids=datos.ventas.map(v=>v.id);
 const ventas=await m.VentaComprobante.findAll({where:{id:ids}});assert.equal(ventas.length,datos.cantidad);
 assert.ok(ventas.every(v=>v.estado_emision==='emitida'&&String(v.snapshot_fiscal_json.igv_porcentaje)==='18'));
 const pedidos=await m.PedidoMaster.findAll({where:{id:ventas.map(v=>v.pedido_id)}});assert.ok(pedidos.every(p=>p.estado_cuenta==='pagada'));
 for(const u of datos.reparto)assert.equal(pedidos.filter(p=>p.usuario_creador_id===u.id).length,u.ventas);
 const items=await m.PedidoItemKds.findAll({where:{pedido_id:pedidos.map(p=>p.id)}});
 const tareas=await m.KdsTarea.findAll({where:{pedido_item_id:items.map(i=>i.id)}});assert.ok(tareas.every(t=>t.estado==='entregado'));
 const reservas=await m.ReservaInsumo.findAll({where:{tarea_id:tareas.map(t=>t.id)}});assert.ok(reservas.every(r=>r.estado==='consumida'));
 const salidas=await m.InventarioKardex.findAll({where:{referencia_documento:tareas.map(t=>`tarea:${t.id}`)}});assert.equal(salidas.length,reservas.length);
 assert.ok(salidas.every(s=>s.tipo_transaccion==='SALIDA_VENTA'));
 const pagos=await m.VentaPagoSplit.findAll({where:{venta_id:ids}});assert.equal(dinero(pagos.reduce((s,p)=>s+centimos(p.monto_pagado),0n)),datos.total);
 assert.equal(await m.TrabajoImpresion.count({where:{venta_id:ids,tipo:'ticket'}}),datos.cantidad);
 const reporte=await consultarGerencial({desde:fecha,hasta:fecha});assert.ok(reporte.estimacion.completa&&valor(reporte.estimacion.resultado_tras_gastos,4)>0n);
 const inventario=await listarInventario();assert.ok(inventario.resumen.bajos>=4&&inventario.resumen.agotados>=1);
 const verificacion={verificado:true,ventas:datos.cantidad,total:datos.total,tareas_entregadas:tareas.length,salidas_kardex:salidas.length,tickets:datos.cantidad,reparto:datos.reparto,ventas_del_dia:reporte.ventas,gastos:reporte.gastos,resultado:reporte.estimacion,inventario:inventario.resumen};
 await writeFile(new URL(`${lote}-verificacion.json`,carpeta),JSON.stringify(verificacion,null,2)+'\n');console.log(JSON.stringify(verificacion,null,2));
}
assert.ok(env.entorno!=='production'&&['localhost','127.0.0.1','::1'].includes(env.database.host));
try{
 const previas=await m.PedidoMaster.count({where:{notas_globales:{[Op.like]:`%${lote}%`}}});
 if(previas){console.log(`Lote ya guardado con ${previas} ventas. No se repite.`);await verificar();}
 else{
  const filtros={desde:fecha,hasta:fecha},antes=await consultarGerencial(filtros);
  assert.ok(antes.estimacion.completa,'Resolver advertencias antes de planificar.');
  const objetivo=2500000n; // Resultado operativo objetivo S/ 250, escala de 4 decimales.
  const politica=politicaFinanciera((await m.ConfiguracionGlobal.findByPk('FINANZAS')).valor_json);
  const [productos,variantes,insumos,categorias,roles,usuarios,clientes,mesas,sesiones,vinculos]=await Promise.all([
   m.ProductoVenta.findAll({where:{estado:'activo',tipo_producto:'plato_preparado'},raw:true}),m.VarianteProducto.findAll({raw:true}),
   m.InsumoAlmacen.findAll({where:{activo:true},order:[['id','ASC']],raw:true}),m.CategoriaVenta.findAll({where:{activa:true},raw:true}),m.Rol.findAll({raw:true}),
   m.Usuario.findAll({where:{estado:'activo'},attributes:['id','rol_id','nombre_completo'],raw:true}),m.Cliente.findAll({where:{estado:'activo'},attributes:['id'],raw:true}),
   m.MesaSalon.findAll({where:{estado_actual:'libre'},raw:true}),m.SesionCajaZ.findAll({where:{estado_sesion:'abierta'},raw:true}),m.ProductoModificador.findAll({raw:true})]);
  const delRol=nombre=>usuarios.filter(u=>roles.some(r=>r.id===u.rol_id&&r.nombre===nombre));
  const meseros=delRol('mesero').sort((a,b)=>a.id-b.id),cocinero=elegir(delRol('cocinero')),admin=elegir(delRol('administrador'));
  const cajero=delRol('cajero').find(u=>sesiones.some(s=>s.cajero_id===u.id));assert.ok(cajero&&meseros.length&&clientes.length&&mesas.length);
  const sesion=sesiones.find(s=>s.cajero_id===cajero.id),mapa=new Map(insumos.map(i=>[i.id,i]));
  const virtual=new Map(insumos.map(i=>[i.id,decimal(i.stock_fisico)-decimal(i.stock_reservado)]));
  const cotizaciones=[];
  for(const p of productos.filter(p=>categorias.some(c=>c.id===p.categoria_id)&&!vinculos.some(v=>v.producto_id===p.id))){
   const vs=variantes.filter(v=>v.producto_id===p.id);
   for(const v of vs.length?vs:[null]){
    const r=await resolverReceta({producto_venta_id:p.id,variante_id:v?.id??null,cantidad:1,modificadores:[]});
    if(r.estado!=='consultado')continue;
    const ingredientes=r.receta.ingredientes.map(i=>({id:i.insumo_id,cantidad:decimal(i.cantidad_bruta_unitaria)}));
    if(ingredientes.some(i=>!mapa.has(i.id)||virtual.get(i.id)<=decimal(mapa.get(i.id).stock_minimo_alerta)))continue;
    const precio=centimos(p.precio_venta_base)+(v?centimos(v.precio_adicional):0n);
    const costo=q=>ingredientes.reduce((s,i)=>s+costoTotalConsumo(i.cantidad*BigInt(q),decimal(mapa.get(i.id).costo_promedio)),0n);
    const margen=q=>centimos(desglosarImpuesto(precio*BigInt(q),politica.tasa).base)*100n-costo(q);
    if(margen(1)>50000n)cotizaciones.push({p,v,ingredientes,precio,margen});
   }
  }
  const plan=[];let estimado=valor(antes.estimacion.resultado_tras_gastos,4);
  while(estimado<objetivo&&plan.length<250){
   const cantidad=randomInt(2,5);
   const posibles=cotizaciones.filter(c=>c.ingredientes.every(i=>virtual.get(i.id)-i.cantidad*BigInt(cantidad)>=decimal(mapa.get(i.id).stock_minimo_alerta)))
     .sort((a,b)=>a.margen(cantidad)===b.margen(cantidad)?a.p.id-b.p.id:a.margen(cantidad)>b.margen(cantidad)?-1:1);
   assert.ok(posibles.length,'El stock actual no alcanza para completar el objetivo sin reabastecer.');
   const c=elegir(posibles.slice(0,30));
   plan.push({c,cantidad});estimado+=c.margen(cantidad);
   for(const i of c.ingredientes)virtual.set(i.id,virtual.get(i.id)-i.cantidad*BigInt(cantidad));
  }
  assert.ok(estimado>=objetivo);
  console.log(JSON.stringify({lote,ventas:plan.length,resultado_antes:antes.estimacion.resultado_tras_gastos,resultado_previsto:formatoReporte(estimado,4),venta_adicional:dinero(plan.reduce((s,l)=>s+l.c.precio*BigInt(l.cantidad),0n))}));
  if(process.argv.includes('--aplicar')){
   const tx=await sequelize.transaction();let salida;
   try{
    // Bloquear y comprobar que el inventario no cambió desde la planificación.
    for(const original of insumos){const actual=await m.InsumoAlmacen.findByPk(original.id,{transaction:tx,lock:tx.LOCK.UPDATE});assert.equal(actual.stock_fisico,original.stock_fisico);assert.equal(actual.stock_reservado,original.stock_reservado);}
    const ventas=[];const ctx=(usuarioId,n,paso)=>({usuarioId,clave:`vzpositivo-20261113-${n}-${paso}`,transaction:tx});
    for(const [n,l] of plan.entries()){
     const mesero=meseros[n%meseros.length],mesa=mesas[n%mesas.length],cliente=elegir(clientes);
     const {pedido}=await crearPedido({tipo_atencion:'salon',mesa_id:mesa.id,cliente_id:cliente.id,notas_globales:`Demostración persistente solicitada · ${lote} · registro ${n+1}`,
      lineas:[{productoId:l.c.p.id,varianteId:l.c.v?.id??null,cantidad:l.cantidad}]},ctx(mesero.id,n,'pedido'));
     const tareas=await m.KdsTarea.findAll({where:{pedido_item_id:pedido.lineas.map(i=>i.id)},transaction:tx});
     for(const t of tareas){const cocina=t.snapshot_json.canal==='cocina';let version=t.version;
      for(const estado of cocina?['preparando',...(/pizza/i.test(t.snapshot_json.nombre_producto)?['horno']:[]),'listo_para_entrega','entregado']:['entregado'])
       await cambiarTareaKds(String(t.id),{version:version++,estado},ctx(cocina?cocinero.id:mesero.id,n,`t${t.id}-${estado}`));
     }
     const b=(await cambiarBloqueoPago(pedido.id,{version:pedido.version},ctx(cajero.id,n,'bloquear'))).pedido;
     const {venta}=await cobrarPedido(pedido.id,{version:b.version,sesion_caja_id:sesion.id,pagos:[{metodo_pago:'efectivo',monto_pagado:pedido.total_preliminar,monto_entregado:pedido.total_preliminar}]},ctx(cajero.id,n,'cobrar'));
     const actual=await m.MesaSalon.findByPk(mesa.id,{transaction:tx});
     await cambiarMesa(mesa.id,'limpiar',{revision:revisionMesa(actual,null,await marcaMesa(mesa.id,tx)),motivo:'Final del ciclo de atención.'},ctx(mesero.id,n,'limpiar'));
     ventas.push({...venta,cliente_id:cliente.id,mesero_id:mesero.id,mesa:mesa.codigo_mesa,producto:l.c.p.nombre,variante:l.c.v?.nombre_variante??null,cantidad:l.cantidad});
    }
    const resultado=await consultarGerencial(filtros,tx);assert.ok(resultado.estimacion.completa);
    assert.equal(resultado.gastos.total,antes.gastos.total);assert.ok(valor(resultado.estimacion.resultado_tras_gastos,4)>=objetivo);
    assert.equal(valor(resultado.estimacion.resultado_tras_gastos,4),estimado);
    salida={lote,origen:'Ventas generadas a solicitud del propietario; no acreditan pagos físicos.',fecha:new Date().toISOString(),cantidad:ventas.length,total:dinero(ventas.reduce((s,v)=>s+centimos(v.total),0n)),ventas,
      reparto:meseros.map(u=>({id:u.id,nombre:u.nombre_completo,ventas:ventas.filter(v=>v.mesero_id===u.id).length})),resultado_antes:antes.estimacion,resultado_despues:resultado.estimacion};
    await auditoriaComercial(admin.id,'ventas_comprobantes',null,{lote,origen:salida.origen,cantidad:ventas.length,total:salida.total,ventas:ventas.map(v=>v.id)},tx);
    await tx.commit();
   }catch(e){await tx.rollback();throw e;}
   await mkdir(carpeta,{recursive:true});await writeFile(archivo,JSON.stringify(salida,null,2)+'\n');
   const inventario=await listarInventario();assert.ok(inventario.resumen.bajos>=4&&inventario.resumen.agotados>=1);
   const ids=salida.ventas.map(v=>v.id);assert.equal(await m.TrabajoImpresion.count({where:{venta_id:ids,tipo:'ticket'}}),salida.cantidad);
   console.log(JSON.stringify({guardadas:salida.cantidad,total:salida.total,reparto:salida.reparto,resultado:salida.resultado_despues,inventario:inventario.resumen},null,2));
   await verificar();
  }
 }
}finally{await sequelize.close();}
