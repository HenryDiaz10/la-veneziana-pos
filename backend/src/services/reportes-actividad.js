import {decimalReporte as valor,formatoReporte as formato} from './reportes-reglas.js';
// Cada dominio se agrega por separado: ni unir detalles de compra ni repetir
// gastos que también tienen un movimiento de caja vinculado.
export async function actividadFinanciera(leer) {
  const compras=`c.estado_registro='confirmada' AND c.estado_pago IN ('pendiente','pagado_parcial','pagado_total') AND c.fecha_emision BETWEEN :desde AND :hasta`;
  const compraDias=await leer(`SELECT DATE_FORMAT(c.fecha_emision,'%Y-%m-%d') fecha,COUNT(*) cantidad,SUM(c.total) total FROM compras_facturas c WHERE ${compras} GROUP BY c.fecha_emision ORDER BY c.fecha_emision`);
  const proveedores=await leer(`SELECT p.id proveedor_id,p.razon_social nombre,COUNT(*) cantidad,SUM(c.total) total FROM compras_facturas c JOIN proveedores_maestro p ON p.id=c.proveedor_id WHERE ${compras} GROUP BY p.id,p.razon_social ORDER BY total DESC,p.id`);
  const documentos=await leer(`SELECT c.id,c.numero_factura,DATE_FORMAT(c.fecha_emision,'%Y-%m-%d') fecha,c.estado_pago,c.total,p.razon_social proveedor FROM compras_facturas c JOIN proveedores_maestro p ON p.id=c.proveedor_id WHERE ${compras} ORDER BY c.fecha_emision DESC,c.id DESC LIMIT 50`);
  const gastos=await leer(`SELECT DATE_FORMAT(g.fecha_gasto,'%Y-%m-%d') fecha,SUM(g.monto_gasto) total FROM gastos_financieros_operativos g LEFT JOIN movimientos_caja_chica m ON m.id=g.movimiento_caja_id WHERE g.fecha_gasto BETWEEN :desde AND :hasta AND (:sesion_id IS NULL OR m.sesion_id= :sesion_id) GROUP BY g.fecha_gasto ORDER BY g.fecha_gasto`);
  const movimientos=await leer(`SELECT DATE_FORMAT(CONVERT_TZ(m.fecha_hora,'+00:00',:offset),'%Y-%m-%d') fecha,SUM(IF(m.tipo='ingreso',m.monto,0)) ingresos,SUM(IF(m.tipo='egreso',m.monto,0)) egresos FROM movimientos_caja_chica m WHERE m.fecha_hora>= :inicio AND m.fecha_hora< :fin AND (:sesion_id IS NULL OR m.sesion_id= :sesion_id) GROUP BY fecha ORDER BY fecha`);
  const [borradores]=await leer(`SELECT COUNT(*) cantidad,COALESCE(SUM(total),0) total FROM compras_facturas WHERE estado_registro='borrador' AND fecha_emision BETWEEN :desde AND :hasta`);
  const importe=x=>formato(valor(x));
  return {compras_por_dia:compraDias.map(c=>({...c,cantidad:Number(c.cantidad),total:importe(c.total)})),
    proveedores:proveedores.map(p=>({...p,proveedor_id:Number(p.proveedor_id),cantidad:Number(p.cantidad),total:importe(p.total)})),
    compras_documentos:documentos.map(c=>({...c,id:Number(c.id),total:importe(c.total)})),
    gastos_por_dia:gastos.map(g=>({...g,total:importe(g.total)})),movimientos_por_dia:movimientos.map(m=>({...m,ingresos:importe(m.ingresos),egresos:importe(m.egresos)})),
    borradores:{cantidad:Number(borradores.cantidad),total:importe(borradores.total)}};
}
