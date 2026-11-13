// Lote persistente autorizado: 19 ventas, reparto entre meseros y alertas reales.
// Sin --aplicar es solo lectura. No cambia stock por UPDATE: lo consumen KDS
// y el Kardex del sistema. Los únicos ajustes son mínimos de alerta auditados.
import assert from 'node:assert/strict';
import {randomInt} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {Op} from 'sequelize';
import {env} from '../src/config/env.js';
import {sequelize} from '../src/config/database.js';
import * as m from '../src/models/index.js';
import {crearPedido,cambiarBloqueoPago} from '../src/services/pedidos.service.js';
import {cobrarPedido} from '../src/services/cobros.service.js';
import {cambiarTareaKds} from '../src/services/kds-comandos.service.js';
import {cambiarMesa,marcaMesa} from '../src/services/mesas.service.js';
import {revisionMesa} from '../src/services/mesas-reglas.js';
import {auditoriaComercial} from '../src/services/operacion-comercial.js';
import {centimos,dinero,politicaFinanciera} from '../src/services/pedidos-calculo.js';
import {decimalInventario as decimal,formatoInventario as formato} from '../src/services/inventario-calculo.js';
import {listarInventario,consultarInventario} from '../src/services/inventario-consulta.service.js';
import {consultarGerencial} from '../src/services/reportes.service.js';

const LOTE='ventas19-stock-20261113',N=19;
const carpeta=new URL('../../../DOCUMENTACION/REGISTROS/',import.meta.url),archivo=new URL(`${LOTE}.json`,carpeta);
const elegir=xs=>{assert.ok(xs.length);return xs[randomInt(xs.length)];};
const aplicar=process.argv.includes('--aplicar');
assert.ok(env.entorno!=='production'&&['127.0.0.1','localhost','::1'].includes(env.database.host),'Solo MySQL local de desarrollo.');

// Verificar también con el contrato que consume la web, no solo los modelos.
async function verificar(lote){
 const ids=lote.ventas.map(v=>v.id),ventas=await m.VentaComprobante.findAll({where:{id:ids}});
 assert.equal(ventas.length,N);assert.ok(ventas.every(v=>v.estado_emision==='emitida'));
 const pedidos=await m.PedidoMaster.findAll({where:{id:ventas.map(v=>v.pedido_id)}});
 assert.ok(pedidos.every(p=>p.estado_cuenta==='pagada'&&p.notas_globales.includes(LOTE)));
 const reparto=Object.fromEntries(lote.reparto.map(u=>[u.id,pedidos.filter(p=>p.usuario_creador_id===u.id).length]));
 assert.deepEqual(reparto,Object.fromEntries(lote.reparto.map(u=>[u.id,u.ventas])));
 const items=await m.PedidoItemKds.findAll({where:{pedido_id:pedidos.map(p=>p.id)}});
 const tareas=await m.KdsTarea.findAll({where:{pedido_item_id:items.map(i=>i.id)}});
 assert.ok(tareas.length&&tareas.every(t=>t.estado==='entregado'));
 const reservas=await m.ReservaInsumo.findAll({where:{tarea_id:tareas.map(t=>t.id)}});
 assert.ok(reservas.length&&reservas.every(r=>r.estado==='consumida'));
 const kardex=await m.InventarioKardex.findAll({where:{referencia_documento:tareas.map(t=>`tarea:${t.id}`)}});
 assert.equal(kardex.length,reservas.length);assert.ok(kardex.every(k=>k.tipo_transaccion==='SALIDA_VENTA'));
 assert.equal(await m.TrabajoImpresion.count({where:{venta_id:ids,tipo:'ticket'}}),N);
 const pagos=await m.VentaPagoSplit.findAll({where:{venta_id:ids}});
 assert.equal(dinero(pagos.reduce((s,p)=>s+centimos(p.monto_pagado),0n)),lote.total);
 const dia=new Date(lote.fecha).toLocaleDateString('en-CA',{timeZone:'America/Lima'});
 const reporte=await consultarGerencial({desde:dia,hasta:dia});
 for(const u of lote.reparto){
   const r=await consultarGerencial({desde:dia,hasta:dia,mesero_id:String(u.id)});
   assert.ok(r.ventas.cantidad>=u.ventas);
 }
 const inventario=await listarInventario();
 assert.ok(inventario.resumen.agotados>=1&&inventario.resumen.bajos>=4);
 const objetivos=[];
 for(const o of lote.objetivos){
   const d=await consultarInventario(o.insumo_id);
   assert.equal(d.insumo.alerta,o.objetivo===0?'agotado':'bajo');
   assert.equal(d.insumo.disponible,`${o.objetivo}.0000`);
   assert.ok(d.conciliacion.coincide,`Kardex descuadrado: ${o.nombre}`);
   objetivos.push({nombre:o.nombre,antes:o.antes,despues:d.insumo.stock_fisico,minimo:d.insumo.stock_minimo_alerta,alerta:d.insumo.alerta,kardex_cuadra:d.conciliacion.coincide});
 }
 const salida={verificado:true,lote:LOTE,ventas:N,total:lote.total,reparto:lote.reparto,objetivos,
   inventario:inventario.resumen,tareas_entregadas:tareas.length,reservas_consumidas:reservas.length,
   salidas_venta_kardex:kardex.length,tickets:N,total_ventas_del_dia:reporte.ventas};
 await writeFile(new URL(`${LOTE}-verificacion.json`,carpeta),JSON.stringify(salida,null,2)+'\n');
 console.log(JSON.stringify(salida,null,2));
}

try{
 if(process.argv.includes('--verificar'))await verificar(JSON.parse(await readFile(archivo,'utf8')));
 else{
   const previas=await m.PedidoMaster.count({where:{notas_globales:{[Op.like]:`%${LOTE}%`}}});
   if(previas){assert.equal(previas,N,'Lote parcial: inspeccionar antes de continuar.');console.log('Lote ya registrado: no se repite ni modifica.');await verificar(JSON.parse(await readFile(archivo,'utf8')));}
   else{
     const [usuarios,roles,clientes,productos,variantes,categorias,insumos,mesas,sesiones]=await Promise.all([
       m.Usuario.findAll({where:{estado:'activo'},attributes:['id','nombre_completo','rol_id'],raw:true}),
       m.Rol.findAll({attributes:['id','nombre'],raw:true}),m.Cliente.findAll({where:{estado:'activo'},attributes:['id','nombres','apellidos'],raw:true}),
       m.ProductoVenta.findAll({where:{estado:'activo'},raw:true}),m.VarianteProducto.findAll({raw:true}),m.CategoriaVenta.findAll({where:{activa:true},raw:true}),
       m.InsumoAlmacen.findAll({where:{activo:true},order:[['id','ASC']],raw:true}),
       m.MesaSalon.findAll({where:{estado_actual:'libre'},raw:true}),m.SesionCajaZ.findAll({where:{estado_sesion:'abierta'},raw:true})]);
     const delRol=nombre=>usuarios.filter(u=>roles.some(r=>r.id===u.rol_id&&r.nombre===nombre));
     const meseros=delRol('mesero').sort((a,b)=>a.id-b.id),cocinero=elegir(delRol('cocinero')),admin=elegir(delRol('administrador'));
     const cajero=delRol('cajero').find(u=>sesiones.some(s=>s.cajero_id===u.id));assert.ok(cajero,'Se necesita una sesión de caja abierta.');
     const sesion=sesiones.find(s=>s.cajero_id===cajero.id);assert.ok(meseros.length&&clientes.length&&mesas.length);
     politicaFinanciera((await m.ConfiguracionGlobal.findByPk('FINANZAS')).valor_json);
     const seleccion=[['Agua San Luis 625 ml',0,4],['Coca-Cola 500 ml',4,4],['Inca Kola 500 ml',4,4],['Coca-Cola 1 litro',5,4],['Inca Kola 1 litro',5,3]];
     const objetivos=seleccion.map(([nombre,objetivo,cuentas])=>{
       const insumo=insumos.find(i=>i.nombre===nombre);assert.ok(insumo);assert.equal(decimal(insumo.stock_reservado),0n,'No consumir reservas de otros pedidos.');
       const p=productos.find(p=>p.tipo_producto==='producto_directo'&&p.insumo_directo_id===insumo.id&&categorias.some(c=>c.id===p.categoria_id));assert.ok(p);
       const disponible=decimal(insumo.stock_fisico);assert.equal(disponible%10000n,0n);assert.ok(disponible>BigInt(objetivo)*10000n);
       return {insumo_id:insumo.id,nombre,producto_id:p.id,objetivo,cuentas,antes:insumo.stock_fisico,minimo_antes:insumo.stock_minimo_alerta,consumir:Number(disponible/10000n)-objetivo};
     });
     // Dividir el consumo entre 19 cuentas; cantidades enteras, sin sobreventa.
     const plan=[];
     for(const o of objetivos)for(let j=0;j<o.cuentas;j++)plan.push({objetivo:o,cantidad:Math.floor(o.consumir/o.cuentas)+(j<o.consumir%o.cuentas?1:0)});
     assert.equal(plan.length,N);
     const reparto=meseros.map((u,j)=>({id:u.id,nombre:u.nombre_completo,ventas:plan.filter((_,i)=>i%meseros.length===j).length}));
     console.log(JSON.stringify({lote:LOTE,reparto,objetivos},null,2));
     if(aplicar){
       const tx=await sequelize.transaction();let salida;
       try{
         // Una transacción abarca el lote completo. No deja pedidos a medias.
         const antes=await m.InsumoAlmacen.findAll({where:{activo:true},order:[['id','ASC']],transaction:tx,lock:tx.LOCK.UPDATE});
         for(const o of objetivos){
           const i=antes.find(i=>i.id===o.insumo_id);assert.equal(i.stock_fisico,o.antes);assert.equal(decimal(i.stock_reservado),0n);
           if(o.objetivo>0){
             await i.update({stock_minimo_alerta:'6.0000'},{transaction:tx});
             await auditoriaComercial(admin.id,'insumos_almacen',i.id,{accion:'configurar_minimo',antes:o.minimo_antes,despues:'6.0000',motivo:`${LOTE}: umbral de reposición de bebidas autorizado.`},tx);
           }
         }
         const principales=productos.filter(p=>p.tipo_producto==='plato_preparado'&&/^Pizza /i.test(p.nombre)&&categorias.some(c=>c.id===p.categoria_id));
         const grupos=await m.ProductoModificador.findAll({transaction:tx,raw:true});
         const obligatorios=await m.ModificadorCatalogo.findAll({where:{es_obligatorio:true},transaction:tx,raw:true});
         const opciones=await m.ModificadorItem.findAll({transaction:tx,raw:true});
         const ventas=[];
         const ctx=(uid,n,paso)=>({usuarioId:uid,clave:`${LOTE}-${n}-${paso}`,transaction:tx});
         for(let n=0;n<N;n++){
           const mesero=meseros[n%meseros.length],mesa=mesas[n%mesas.length],cliente=elegir(clientes),p=elegir(principales),o=plan[n];
           const vs=variantes.filter(v=>v.producto_id===p.id),variante=elegir(vs);
           const mods=grupos.filter(g=>g.producto_id===p.id&&obligatorios.some(o=>o.id===g.grupo_id)).map(g=>elegir(opciones.filter(o=>o.grupo_id===g.grupo_id)).id);
           const {pedido}=await crearPedido({tipo_atencion:'salon',mesa_id:mesa.id,cliente_id:cliente.id,
             notas_globales:`Demostración persistente solicitada · ${LOTE} · cuenta ${n+1}/19`,
             lineas:[{productoId:p.id,varianteId:variante.id,modificadoresIds:mods,cantidad:1},{productoId:o.objetivo.producto_id,cantidad:o.cantidad}]},ctx(mesero.id,n,'pedido'));
           const tareas=await m.KdsTarea.findAll({where:{pedido_item_id:pedido.lineas.map(i=>i.id)},transaction:tx});
           for(const t of tareas){
             const cocina=t.snapshot_json.canal==='cocina';
             const estados=cocina?['preparando','horno','listo_para_entrega','entregado']:['entregado'];
             let version=t.version;
             for(const estado of estados)await cambiarTareaKds(String(t.id),{version:version++,estado},ctx(cocina?cocinero.id:mesero.id,n,`t${t.id}-${estado}`));
           }
           const b=(await cambiarBloqueoPago(pedido.id,{version:pedido.version},ctx(cajero.id,n,'bloquear'))).pedido;
           const {venta}=await cobrarPedido(pedido.id,{version:b.version,sesion_caja_id:sesion.id,pagos:[{metodo_pago:'efectivo',monto_pagado:pedido.total_preliminar,monto_entregado:pedido.total_preliminar}]},ctx(cajero.id,n,'cobrar'));
           const mesaActual=await m.MesaSalon.findByPk(mesa.id,{transaction:tx});
           await cambiarMesa(mesa.id,'limpiar',{revision:revisionMesa(mesaActual,null,await marcaMesa(mesa.id,tx)),motivo:`Limpieza al terminar ${LOTE}.`},ctx(mesero.id,n,'limpiar'));
           ventas.push({...venta,cliente_id:cliente.id,mesero_id:mesero.id,mesero:mesero.nombre_completo,mesa:mesa.codigo_mesa,lineas:pedido.lineas.map(l=>({nombre:l.nombre,variante:l.variante,cantidad:l.cantidad}))});
           console.log(`Preparada ${n+1}/19: ${mesero.nombre_completo}, venta ${venta.id}, S/ ${venta.total}`);
         }
         const despues=await m.InsumoAlmacen.findAll({where:{activo:true},transaction:tx});
         const items=await m.PedidoItemKds.findAll({where:{pedido_id:ventas.map(v=>v.pedido_id)},transaction:tx});
         const tareas=await m.KdsTarea.findAll({where:{pedido_item_id:items.map(i=>i.id)},transaction:tx});
         const reservas=await m.ReservaInsumo.findAll({where:{tarea_id:tareas.map(t=>t.id)},transaction:tx});
         const cambios=[];
         // Probar para todos los insumos que cada decremento es exactamente su
         // consumo del lote, y que no se dejan reservas pendientes.
         for(const previo of antes){
           const actual=despues.find(i=>i.id===previo.id),consumo=reservas.filter(r=>r.insumo_id===previo.id).reduce((s,r)=>s+decimal(r.cantidad_base),0n);
           // Las instancias actualizadas de mínimos no cambian sus cantidades.
           assert.equal(decimal(previo.stock_fisico)-decimal(actual.stock_fisico),consumo,`Diferencia de stock en ${previo.nombre}`);
           assert.equal(actual.stock_reservado,previo.stock_reservado);
           if(consumo>0n)cambios.push({id:previo.id,nombre:previo.nombre,antes:previo.stock_fisico,consumo:formato(consumo),despues:actual.stock_fisico});
         }
         for(const o of objetivos){const a=despues.find(i=>i.id===o.insumo_id);assert.equal(a.stock_fisico,`${o.objetivo}.0000`);}
         assert.ok(tareas.every(t=>t.estado==='entregado')&&reservas.every(r=>r.estado==='consumida'));
         const total=dinero(ventas.reduce((s,v)=>s+centimos(v.total),0n));
         salida={lote:LOTE,origen:'Datos generados a solicitud del propietario; no acreditan pagos físicos.',fecha:new Date().toISOString(),cantidad:N,total,sesion_caja_id:sesion.id,reparto,objetivos,cambios,ventas};
         await auditoriaComercial(admin.id,'ventas_comprobantes',null,{lote:LOTE,cantidad:N,total,ventas:ventas.map(v=>v.id),reparto,objetivos},tx);
         await tx.commit();
       }catch(e){await tx.rollback();throw e;}
       await mkdir(carpeta,{recursive:true});await writeFile(archivo,JSON.stringify(salida,null,2)+'\n');
       await verificar(salida);
     }
   }
 }
}finally{await sequelize.close();}
