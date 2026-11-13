// Carga persistente solicitada: usa los mismos servicios transaccionales del POS.
// Nunca ejecutar en producción. Sin --aplicar solo inspecciona la disponibilidad.
import assert from 'node:assert/strict';
import {randomInt} from 'node:crypto';
import {Op} from 'sequelize';
import {writeFile,mkdir} from 'node:fs/promises';
import {env} from '../src/config/env.js';
import {sequelize} from '../src/config/database.js';
import * as m from '../src/models/index.js';
import {crearPedido,cambiarBloqueoPago} from '../src/services/pedidos.service.js';
import {cobrarPedido} from '../src/services/cobros.service.js';
import {abrirCaja} from '../src/services/caja.service.js';
import {cambiarTareaKds} from '../src/services/kds-comandos.service.js';
import {cambiarMesa,marcaMesa} from '../src/services/mesas.service.js';
import {revisionMesa} from '../src/services/mesas-reglas.js';
import {auditoriaComercial} from '../src/services/operacion-comercial.js';
import {politicaFinanciera,centimos,dinero} from '../src/services/pedidos-calculo.js';

const LOTE='ventas23-20261113',CANTIDAD=23;
const aplicar=process.argv.includes('--aplicar');
const escoger=xs=>xs[randomInt(xs.length)];
assert.ok(env.entorno!=='production'&&['localhost','127.0.0.1','::1'].includes(env.database.host),'Solo desarrollo local.');
try{
  const [clientes,usuarios,roles,mesas,cajas,sesiones,productos,variantes,categorias]=await Promise.all([
    m.Cliente.findAll({where:{estado:'activo'},attributes:['id','nombres','apellidos'],raw:true}),
    m.Usuario.findAll({where:{estado:'activo'},attributes:['id','nombre_completo','rol_id'],raw:true}),
    m.Rol.findAll({attributes:['id','nombre'],raw:true}),
    m.MesaSalon.findAll({attributes:['id','codigo_mesa','estado_actual'],raw:true}),
    m.CajaFisica.findAll({where:{estado:'activa'},attributes:['id','nombre_terminal','cajero_asignado_id'],raw:true}),
    m.SesionCajaZ.findAll({where:{estado_sesion:'abierta'},attributes:['id','caja_fisica_id','cajero_id'],raw:true}),
    m.ProductoVenta.findAll({where:{estado:'activo'},attributes:['id','nombre','categoria_id','tipo_producto','precio_venta_base'],raw:true}),
    m.VarianteProducto.findAll({attributes:['id','producto_id','nombre_variante'],raw:true}),
    m.CategoriaVenta.findAll({where:{activa:true},attributes:['id','nombre'],raw:true})
  ]);
  const rol=id=>roles.find(r=>r.id===id)?.nombre;
  const finanzas=await m.ConfiguracionGlobal.findByPk('FINANZAS');
  if(!aplicar)console.log('FINANZAS',JSON.stringify(finanzas?.get({plain:true})??null));
  if(!aplicar)console.log(JSON.stringify({clientes:clientes.length,usuarios:usuarios.map(u=>({...u,rol:rol(u.rol_id)})),mesas,cajas,sesiones,
    productos:productos.filter(p=>categorias.some(c=>c.id===p.categoria_id)).map(p=>({...p,variantes:variantes.filter(v=>v.producto_id===p.id)}))},null,2));
  const completadas=aplicar?await m.IdempotenciaOperacion.count({where:{tipo_operacion:'pedido.cobrar',clave:{[Op.like]:`${LOTE}-%-cobrar`},estado:'confirmada'}}):0;
  if(completadas===CANTIDAD)console.log('El lote ya tiene sus 23 ventas guardadas. No se modifica caja, ventas ni archivo de ejecución.');
  else if(!aplicar)process.exitCode=0;
  else{
    assert.ok(clientes.length,'Faltan clientes activos.');
    // El propietario indicó IGV 18% y la carta publica precios finales.
    // La opción explícita corrige la configuración inicial pendiente, auditada.
    if(process.argv.includes('--igv18'))await sequelize.transaction(async transaction=>{
      const administrador=usuarios.find(u=>rol(u.rol_id)==='administrador');assert.ok(administrador&&finanzas);
      const antes=finanzas.valor_json;
      const despues={...antes,igv_porcentaje:'18',precios_incluyen_impuesto:true};
      politicaFinanciera(despues);
      await finanzas.update({valor_json:despues,descripcion:'IGV 18% indicado por el propietario; precios finales de carta incluyen impuesto.'},{transaction});
      await auditoriaComercial(administrador.id,'configuracion_global',null,{parametro:'FINANZAS',antes,despues,motivo:`Configuración para ${LOTE}; tasa indicada por el propietario.`},transaction);
    });
    politicaFinanciera((await m.ConfiguracionGlobal.findByPk('FINANZAS'))?.valor_json);
    const meseros=usuarios.filter(u=>rol(u.rol_id)==='mesero'),cocineros=usuarios.filter(u=>rol(u.rol_id)==='cocinero');
    const cajeros=usuarios.filter(u=>rol(u.rol_id)==='cajero');
    assert.ok(meseros.length&&cocineros.length&&cajeros.length,'Se necesitan mesero, cocinero y cajero activos existentes.');
    const libres=mesas.filter(mesa=>mesa.estado_actual==='libre');
    assert.ok(libres.length,'No hay mesas libres.');
    const caja=cajas.find(c=>cajeros.some(u=>u.id===c.cajero_asignado_id)&&(!sesiones.some(s=>s.caja_fisica_id===c.id)||sesiones.some(s=>s.caja_fisica_id===c.id&&s.cajero_id===c.cajero_asignado_id)));
    assert.ok(caja,'No hay caja asignada a un cajero disponible.');
    const cajero=cajeros.find(u=>u.id===caja.cajero_asignado_id);
    // Claves fijas por lote/posición: relanzar nunca añade otras 23 ventas.
    const contexto=(usuarioId,i,paso,transaction)=>({usuarioId,clave:`${LOTE}-${i}-${paso}`,transaction});
    let sesion=sesiones.find(s=>s.cajero_id===cajero.id&&s.caja_fisica_id===caja.id);
    if(!sesion)sesion=(await abrirCaja({caja_fisica_id:caja.id,apertura_monto_base:'0.00'},contexto(cajero.id,0,'abrir'))).sesion;
    const grupos=await m.ProductoModificador.findAll({raw:true});
    const obligatorios=await m.ModificadorCatalogo.findAll({where:{es_obligatorio:true},raw:true});
    const opciones=await m.ModificadorItem.findAll({raw:true});
    const candidatos=productos.filter(p=>categorias.some(c=>c.id===p.categoria_id)&&['plato_preparado','producto_directo'].includes(p.tipo_producto));
    const resultados=[];
    for(let i=1;i<=CANTIDAD;i++){
      const previa=await m.IdempotenciaOperacion.findOne({where:{usuario_id:cajero.id,tipo_operacion:'pedido.cobrar',clave:`${LOTE}-${i}-cobrar`}});
      if(previa){resultados.push(previa.respuesta_json.venta);console.log(`Ya guardada ${i}: venta ${previa.respuesta_json.venta.id}`);continue;}
      let guardada=false;
      // La venta completa es una transacción: si falta stock/receta, probar otra
      // combinación revierte también mesa, reserva, puntos, cobro y ticket.
      for(let intento=0;intento<50&&!guardada;intento++){
        const tx=await sequelize.transaction();
        try{
          const cliente=escoger(clientes),mesero=escoger(meseros),cocinero=escoger(cocineros),mesa=escoger(libres);
          const elegidos=[escoger(candidatos),escoger(candidatos)];
          const lineas=elegidos.map(p=>{
            const vs=variantes.filter(v=>v.producto_id===p.id);
            const mods=grupos.filter(g=>g.producto_id===p.id&&obligatorios.some(o=>o.id===g.grupo_id)).map(g=>{
              const os=opciones.filter(o=>o.grupo_id===g.grupo_id);assert.ok(os.length);return escoger(os).id;
            });
            return {productoId:p.id,varianteId:vs.length?escoger(vs).id:null,cantidad:randomInt(1,3),modificadoresIds:mods};
          });
          const {pedido}=await crearPedido({tipo_atencion:'salon',mesa_id:mesa.id,cliente_id:cliente.id,
            notas_globales:`Demostración persistente solicitada · ${LOTE} · registro ${i}/23`,lineas},contexto(mesero.id,i,'pedido',tx));
          const tareas=await m.KdsTarea.findAll({where:{pedido_item_id:pedido.lineas.map(l=>l.id)},transaction:tx});
          for(const tarea of tareas){
            const cocina=tarea.snapshot_json.canal==='cocina';
            const estados=cocina?['preparando',...(/pizza/i.test(tarea.snapshot_json.nombre_producto)?['horno']:[]),'listo_para_entrega','entregado']:['entregado'];
            let version=tarea.version;
            for(const estado of estados)await cambiarTareaKds(String(tarea.id),{version:version++,estado},contexto(cocina?cocinero.id:mesero.id,i,`t${tarea.id}-${estado}`,tx));
          }
          const bloqueado=(await cambiarBloqueoPago(pedido.id,{version:pedido.version},contexto(cajero.id,i,'bloquear',tx))).pedido;
          const {venta}=await cobrarPedido(pedido.id,{version:bloqueado.version,sesion_caja_id:sesion.id,
            pagos:[{metodo_pago:'efectivo',monto_pagado:pedido.total_preliminar,monto_entregado:pedido.total_preliminar}]},contexto(cajero.id,i,'cobrar',tx));
          // Completar limpieza sin tocar mesas ajenas o cuentas previamente abiertas.
          const actual=await m.MesaSalon.findByPk(mesa.id,{transaction:tx});
          await cambiarMesa(mesa.id,'limpiar',{revision:revisionMesa(actual,null,await marcaMesa(mesa.id,tx)),motivo:'Fin del ciclo de atención del lote solicitado.'},contexto(mesero.id,i,'limpiar',tx));
          await tx.commit();guardada=true;
          resultados.push({...venta,cliente_id:cliente.id,cliente:[cliente.nombres,cliente.apellidos].filter(Boolean).join(' '),mesa:mesa.codigo_mesa,productos:pedido.lineas.map(l=>({nombre:l.nombre,variante:l.variante,cantidad:l.cantidad})),mesero:mesero.nombre_completo});
          console.log(`GUARDADA ${i}/23: venta ${venta.id}, cliente ${cliente.id}, ${mesa.codigo_mesa}, S/ ${venta.total}`);
        }catch(e){await tx.rollback();if(!['STOCK_INSUFICIENTE','RECETA_NO_DISPONIBLE','INSUMO_NO_DISPONIBLE','PRODUCTO_NO_SOPORTADO'].includes(e.codigo))throw e;console.log(`Reintento ${i}: ${e.codigo}`);}
      }
      assert.ok(guardada,`No fue posible completar el registro ${i}.`);
    }
    assert.equal(resultados.length,CANTIDAD);
    const ids=resultados.map(v=>v.id);
    assert.equal(await m.VentaComprobante.count({where:{id:ids}}),CANTIDAD);
    assert.equal(await m.TrabajoImpresion.count({where:{venta_id:ids,tipo:'ticket'}}),CANTIDAD);
    const total=dinero(resultados.reduce((s,v)=>s+centimos(v.total),0n));
    const salida={lote:LOTE,origen:'Demostración persistente solicitada por el propietario; no acredita transacciones físicas.',fecha:new Date().toISOString(),cantidad:23,total,sesion_caja_id:sesion.id,ventas:resultados};
    const carpeta=new URL('../../../DOCUMENTACION/REGISTROS/',import.meta.url);
    await mkdir(carpeta,{recursive:true});
    await writeFile(new URL(`${LOTE}.json`,carpeta),JSON.stringify(salida,null,2)+'\n');
    console.log(JSON.stringify({cantidad:23,total,ventas:ids,sesion:sesion.id,mesas_libres:await m.MesaSalon.count({where:{id:libres.map(m=>m.id),estado_actual:'libre'}})}));
  }
}finally{await sequelize.close();}
