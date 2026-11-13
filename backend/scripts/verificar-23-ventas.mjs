// Verificación de solo lectura del lote persistente: jamás borra ni recrea ventas.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sequelize} from '../src/config/database.js';
import * as m from '../src/models/index.js';
import {consultarGerencial} from '../src/services/reportes.service.js';
import {consultarResumenCaja} from '../src/services/caja-cierre.service.js';
import {centimos,dinero} from '../src/services/pedidos-calculo.js';

try{
  const lote=JSON.parse(await readFile(new URL('../../../DOCUMENTACION/REGISTROS/ventas23-20261113.json',import.meta.url),'utf8'));
  const ids=lote.ventas.map(v=>v.id),ventas=await m.VentaComprobante.findAll({where:{id:ids}});
  assert.equal(ventas.length,23);assert.ok(ventas.every(v=>v.estado_emision==='emitida'));
  const pedidos=await m.PedidoMaster.findAll({where:{id:ventas.map(v=>v.pedido_id)}});
  assert.ok(pedidos.every(p=>p.estado_cuenta==='pagada'&&p.cliente_id&&p.mesa_id&&p.notas_globales.includes(lote.lote)));
  const items=await m.PedidoItemKds.findAll({where:{pedido_id:pedidos.map(p=>p.id)}});
  const tareas=await m.KdsTarea.findAll({where:{pedido_item_id:items.map(i=>i.id)}});
  assert.ok(tareas.length&&tareas.every(t=>t.estado==='entregado'));
  const reservas=await m.ReservaInsumo.findAll({where:{tarea_id:tareas.map(t=>t.id)}});
  assert.ok(reservas.length&&reservas.every(r=>r.estado==='consumida'));
  assert.equal(await m.InventarioKardex.count({where:{referencia_documento:tareas.map(t=>`tarea:${t.id}`)}}),reservas.length);
  assert.ok(ventas.every(v=>centimos(v.subtotal_gravado)+centimos(v.igv_total)===centimos(v.total_final_venta)));
  assert.equal(await m.TrabajoImpresion.count({where:{venta_id:ids,tipo:'ticket'}}),23);
  const pagos=await m.VentaPagoSplit.findAll({where:{venta_id:ids}});
  assert.equal(pagos.length,23);
  assert.equal(dinero(pagos.reduce((s,p)=>s+centimos(p.monto_pagado),0n)),lote.total);
  const dia=new Date(lote.fecha).toLocaleDateString('en-CA',{timeZone:'America/Lima'});
  const reporte=await consultarGerencial({desde:dia,hasta:dia,sesion_id:String(lote.sesion_caja_id)});
  // El lote conserva sus 23 registros aunque después haya nuevas ventas en
  // el mismo día/turno. Su importe exacto ya se cotejó con sus propios pagos.
  assert.ok(reporte.ventas.cantidad>=23&&centimos(reporte.ventas.total)>=centimos(lote.total));
  assert.ok(reporte.clientes.resumen.compras_identificadas>=23);
  assert.ok(centimos(reporte.clientes.resumen.ingreso_neto)>=centimos(lote.total));
  const sesion=await m.SesionCajaZ.findByPk(lote.sesion_caja_id);
  const caja=await consultarResumenCaja(sesion.id,{usuarioId:sesion.cajero_id});
  assert.ok(centimos(caja.resumen.totales.total_ventas)>=centimos(lote.total));
  console.log(JSON.stringify({verificado:true,fecha:dia,ventas:ventas.length,total:lote.total,
    clientes_distintos:reporte.clientes.resumen.activos,mesas_distintas:new Set(pedidos.map(p=>p.mesa_id)).size,
    lineas:items.length,tareas_entregadas:tareas.length,reservas_consumidas:reservas.length,tickets:23,
    reporte_ventas:reporte.ventas,reporte_clientes:reporte.clientes.resumen,
    sesion_caja:lote.sesion_caja_id,resumen_caja:caja},null,2));
}finally{await sequelize.close();}
