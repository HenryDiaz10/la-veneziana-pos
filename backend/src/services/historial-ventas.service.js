import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { campos, exigirPedido as exigir, idGrande } from './pedidos-calculo.js';
import { filtrosReporte, decimalReporte, formatoReporte } from './reportes-reglas.js';
import { MEDIOS_CAJA } from './caja-calculo.js';

export function filtrosHistorial(q) {
  campos(q, ['desde','hasta','estado','canal','medio','busqueda','pagina','limite']);
  const f = filtrosReporte({ desde:q.desde, hasta:q.hasta, estado:q.estado ?? 'todos', canal:q.canal ?? 'todos' });
  const entero = (s, defecto, maximo) => {
    if (s === undefined) return defecto;
    exigir(typeof s === 'string' && /^[1-9]\d{0,5}$/.test(s));
    const n = Number(s); exigir(n <= maximo); return n;
  };
  const medio = q.medio ?? 'todos'; exigir(medio === 'todos' || MEDIOS_CAJA.includes(medio));
  const busqueda = q.busqueda ?? '';
  exigir(typeof busqueda === 'string' && busqueda.length <= 150 && !/[\u0000-\u001f\u007f]/u.test(busqueda));
  return { ...f, medio, busqueda:busqueda.trim(), pagina:entero(q.pagina,1,10000), limite:entero(q.limite,10,50) };
}
const jsonTexto = (col, ruta) => `NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${col},'${ruta}')),'null'),'')`;
const clienteNombre = `COALESCE(${jsonTexto('v.snapshot_fiscal_json','$.cliente.nombre')},${jsonTexto('p.snapshot_cliente_json','$.nombre')},NULLIF(TRIM(CONCAT_WS(' ',c.nombres,c.apellidos)),''),'Cliente no registrado')`;
const clienteTelefono = `COALESCE(${jsonTexto('v.snapshot_fiscal_json','$.cliente.telefono')},${jsonTexto('p.snapshot_cliente_json','$.telefono')},c.telefono_principal)`;
const uniones = `FROM ventas_comprobantes v JOIN pedidos_master p ON p.id=v.pedido_id
 LEFT JOIN clientes c ON c.id=p.cliente_id LEFT JOIN usuarios u ON u.id=v.cajero_id
 LEFT JOIN usuarios m ON m.id=p.usuario_creador_id LEFT JOIN mesas_salon mesa ON mesa.id=p.mesa_id`;
const devuelto = `(SELECT COALESCE(SUM(d.total),0) FROM ventas_devoluciones d WHERE d.venta_id=v.id)`;
const cabecera = `v.id,v.pedido_id,v.serie_correlativo,v.fecha_emision,v.estado_emision,v.tipo_documento_fiscal,
 v.subtotal_gravado,v.igv_total,v.descuento_global,v.total_final_venta,p.codigo_pedido,p.tipo_atencion,
 ${clienteNombre} cliente_nombre,${clienteTelefono} cliente_telefono,p.cliente_id,
 u.nombre_completo cajero,m.nombre_completo responsable,mesa.codigo_mesa,${devuelto} devuelto`;
const presentar = r => ({ id:String(r.id), pedido_id:String(r.pedido_id), codigo:r.serie_correlativo,
 fecha:new Date(r.fecha_emision).toISOString(), estado:r.estado_emision, documento:r.tipo_documento_fiscal,
 pedido:r.codigo_pedido, canal:r.tipo_atencion, mesa:r.codigo_mesa ?? null,
 cliente:{id:r.cliente_id, nombre:r.cliente_nombre, telefono:r.cliente_telefono ?? null},
 cajero:r.cajero, responsable:r.responsable,
 base:r.subtotal_gravado, igv:r.igv_total, descuento:r.descuento_global ?? '0.00',
 total:r.total_final_venta, devuelto:formatoReporte(decimalReporte(r.devuelto)) });
const transaccion = padre => padre ? {transaction:padre} : {isolationLevel:Transaction.ISOLATION_LEVELS.REPEATABLE_READ};

export function listarHistorialVentas(query, padre) {
  const f = filtrosHistorial(query);
  return sequelize.transaction(transaccion(padre), async transaction => {
    const replacements = {...f, patron:`%${f.busqueda.replace(/[!%_]/g,'!$&')}%`, salto:(f.pagina-1)*f.limite};
    const leer = sql => sequelize.query(sql,{replacements,type:QueryTypes.SELECT,transaction});
    // Filtrar pagos mediante EXISTS: una venta mixta nunca multiplica filas ni importes.
    const donde = `v.fecha_emision>= :inicio AND v.fecha_emision< :fin
      AND (:estado = 'todos' OR v.estado_emision= :estado) AND (:canal = 'todos' OR p.tipo_atencion= :canal)
      AND (:medio = 'todos' OR EXISTS(SELECT 1 FROM ventas_pagos_split pago WHERE pago.venta_id=v.id AND pago.metodo_pago= :medio))
      AND (:busqueda = '' OR ${clienteNombre} LIKE :patron ESCAPE '!' OR ${clienteTelefono} LIKE :patron ESCAPE '!'
        OR c.numero_documento LIKE :patron ESCAPE '!' OR v.serie_correlativo LIKE :patron ESCAPE '!'
        OR p.codigo_pedido LIKE :patron ESCAPE '!')`;
    const [resumen] = await leer(`SELECT COUNT(*) cantidad,
      COALESCE(SUM(IF(v.estado_emision<>'anulada',v.total_final_venta,0)),0) vigentes,
      COALESCE(SUM(IF(v.estado_emision<>'anulada',${devuelto},0)),0) devuelto
      ${uniones} WHERE ${donde}`);
    const filas = await leer(`SELECT ${cabecera} ${uniones} WHERE ${donde} ORDER BY v.fecha_emision DESC,v.id DESC LIMIT :limite OFFSET :salto`);
    const ventas = filas.map(presentar);
    if (ventas.length) {
      const pagos = await sequelize.query('SELECT venta_id,metodo_pago,monto_pagado FROM ventas_pagos_split WHERE venta_id IN (:ids) ORDER BY id',
        {replacements:{ids:ventas.map(v=>v.id)},type:QueryTypes.SELECT,transaction});
      for (const v of ventas) v.pagos = pagos.filter(p=>String(p.venta_id)===v.id).map(p=>({metodo:p.metodo_pago,importe:p.monto_pagado}));
    }
    const cantidad=Number(resumen.cantidad); exigir(Number.isSafeInteger(cantidad),'REPORTE_INCONSISTENTE');
    return { ventas, resumen:{cantidad,total:formatoReporte(decimalReporte(resumen.vigentes)),devuelto:formatoReporte(decimalReporte(resumen.devuelto)),neto:formatoReporte(decimalReporte(resumen.vigentes)-decimalReporte(resumen.devuelto))},
      paginacion:{pagina:f.pagina,limite:f.limite,total:cantidad,totalPaginas:Math.ceil(cantidad/f.limite)},
      filtros:{desde:f.desde,hasta:f.hasta,estado:f.estado,canal:f.canal,medio:f.medio,busqueda:f.busqueda},consultado_en:new Date().toISOString() };
  });
}
export function consultarVentaHistorial(id, padre) {
  id=idGrande(id);
  return sequelize.transaction(transaccion(padre), async transaction => {
    const leer = sql => sequelize.query(sql,{replacements:{id},type:QueryTypes.SELECT,transaction});
    const [r] = await leer(`SELECT ${cabecera} ${uniones} WHERE v.id= :id`);
    exigir(r,'OPERACION_INEXISTENTE');
    // Solo snapshots de la venta; no consultar precios o recetas actuales.
    const lineas = await leer('SELECT descripcion_snapshot descripcion,cantidad,precio_unitario,total,snapshot_json FROM ventas_detalle_snapshot WHERE venta_id= :id ORDER BY id');
    const pagos = await leer('SELECT metodo_pago metodo,monto_pagado importe,monto_entregado recibido,vuelto FROM ventas_pagos_split WHERE venta_id= :id ORDER BY id');
    const devoluciones = await leer('SELECT id,motivo,total,creado_en fecha FROM ventas_devoluciones WHERE venta_id= :id ORDER BY id');
    return {venta:{...presentar(r),lineas:lineas.map(l=>({descripcion:l.descripcion,cantidad:l.cantidad,precio_unitario:l.precio_unitario,total:l.total,variante:l.snapshot_json?.variante ?? null,indicaciones:l.snapshot_json?.indicaciones ?? null,modificadores:(l.snapshot_json?.modificadores ?? []).map(m=>m.es_exclusion?`Excluir: ${m.nombre}`:m.nombre)})),pagos,
      devoluciones:devoluciones.map(d=>({...d,id:String(d.id),fecha:new Date(d.fecha).toISOString()}))}};
  });
}
