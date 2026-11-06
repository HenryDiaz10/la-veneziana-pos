import { formatoReporte as formato, decimalReporte as valor } from './reportes-reglas.js';
// Cada consulta agrega su propio dominio: no unir pagos con líneas de venta,
// porque un ticket con varios pagos multiplicaría unidades/importes.
export async function analiticaGerencial(leer, ventas) {
  const responsables=await leer(`SELECT u.id usuario_id,u.nombre_completo nombre FROM usuarios u JOIN roles r ON r.id=u.rol_id
    WHERE (r.nombre='mesero' AND u.estado='activo') OR EXISTS(SELECT 1 FROM pedidos_master pr WHERE pr.usuario_creador_id=u.id AND pr.tipo_atencion='salon') ORDER BY u.nombre_completo,u.id LIMIT 100`);
  const canales=await leer(`SELECT p.tipo_atencion canal,COUNT(*) cantidad,COALESCE(SUM(v.total_final_venta),0) total
    FROM ventas_comprobantes v JOIN pedidos_master p ON p.id=v.pedido_id WHERE ${ventas}
    GROUP BY p.tipo_atencion ORDER BY total DESC,p.tipo_atencion`);
  const horas=await leer(`SELECT HOUR(CONVERT_TZ(v.fecha_emision,'+00:00',:offset)) hora,COUNT(*) cantidad,COALESCE(SUM(v.total_final_venta),0) total
    FROM ventas_comprobantes v WHERE ${ventas} GROUP BY hora ORDER BY hora`);
  const calor=await leer(`SELECT WEEKDAY(CONVERT_TZ(v.fecha_emision,'+00:00',:offset)) dia,
    HOUR(CONVERT_TZ(v.fecha_emision,'+00:00',:offset)) hora,COUNT(*) cantidad,COALESCE(SUM(v.total_final_venta),0) total
    FROM ventas_comprobantes v WHERE ${ventas} GROUP BY dia,hora ORDER BY dia,hora`);
  // Una cuenta cobrada cuenta como una atención; la misma mesa puede atenderse
  // varias veces. No atribuir historia al mesero asignado actualmente a la mesa.
  const meseros=await leer(`SELECT p.usuario_creador_id usuario_id,u.nombre_completo nombre,
    COUNT(*) atenciones,COUNT(DISTINCT p.mesa_id) mesas_distintas,COALESCE(SUM(v.total_final_venta),0) total
    FROM ventas_comprobantes v JOIN pedidos_master p ON p.id=v.pedido_id JOIN usuarios u ON u.id=p.usuario_creador_id
    WHERE ${ventas} AND p.tipo_atencion='salon' AND p.mesa_id IS NOT NULL
    GROUP BY p.usuario_creador_id,u.nombre_completo ORDER BY atenciones DESC,total DESC,p.usuario_creador_id LIMIT 20`);
  // Snapshots comerciales: cantidades históricas aun si después cambia receta,
  // catálogo o precio. Las devoluciones no reducen estas unidades brutas.
  const productos=await leer(`SELECT i.producto_venta_id producto_id,p.nombre,SUM(d.cantidad) unidades,
    COUNT(DISTINCT v.id) tickets FROM ventas_detalle_snapshot d
    JOIN ventas_comprobantes v ON v.id=d.venta_id JOIN pedido_items_kds i ON i.id=d.pedido_item_id
    JOIN productos_venta p ON p.id=i.producto_venta_id WHERE ${ventas}
    GROUP BY i.producto_venta_id,p.nombre ORDER BY unidades DESC,i.producto_venta_id`);
  const categorias=await leer(`SELECT c.id,c.nombre,SUM(d.cantidad) unidades FROM ventas_detalle_snapshot d
    JOIN ventas_comprobantes v ON v.id=d.venta_id JOIN pedido_items_kds i ON i.id=d.pedido_item_id
    JOIN productos_venta p ON p.id=i.producto_venta_id JOIN categorias_venta c ON c.id=p.categoria_id
    WHERE ${ventas} GROUP BY c.id,c.nombre ORDER BY unidades DESC,c.id LIMIT 20`);
  const activos=await leer(`SELECT p.id,p.nombre FROM productos_venta p JOIN categorias_venta c ON c.id=p.categoria_id
    WHERE p.estado='activo' AND c.activa=1 ORDER BY p.nombre,p.id`);
  const usados=new Set(productos.map(p=>Number(p.producto_id)));
  const ceros=activos.filter(p=>!usados.has(Number(p.id)));
  const serializar=p=>({producto_id:Number(p.producto_id),nombre:p.nombre,unidades:String(p.unidades),tickets:Number(p.tickets)});
  return {productos_vendidos:productos.length,responsables:responsables.map(r=>({usuario_id:Number(r.usuario_id),nombre:r.nombre})),canales:canales.map(c=>({...c,cantidad:Number(c.cantidad),total:formato(valor(c.total))})),
    horas:Array.from({length:24},(_,hora)=>{const h=horas.find(h=>Number(h.hora)===hora);return {hora,cantidad:Number(h?.cantidad??0),total:formato(valor(h?.total))};}),
    calor:calor.map(c=>({...c,dia:Number(c.dia),hora:Number(c.hora),cantidad:Number(c.cantidad),total:formato(valor(c.total))})),
    meseros:meseros.map(m=>({...m,usuario_id:Number(m.usuario_id),atenciones:Number(m.atenciones),mesas_distintas:Number(m.mesas_distintas),total:formato(valor(m.total))})),
    productos_top:productos.slice(0,10).map(serializar),
    productos_baja_rotacion:[...productos].sort((a,b)=>BigInt(a.unidades)<BigInt(b.unidades)?-1:BigInt(a.unidades)>BigInt(b.unidades)?1:Number(a.producto_id)-Number(b.producto_id)).slice(0,10).map(serializar),
    sin_ventas:{cantidad:ceros.length,productos:ceros.slice(0,50).map(p=>({producto_id:Number(p.id),nombre:p.nombre,unidades:'0'}))},
    categorias:categorias.map(c=>({id:Number(c.id),nombre:c.nombre,unidades:String(c.unidades)})),
    alcance:'Unidades brutas de snapshots comerciales, sin descontar devoluciones; variantes agrupadas por producto. Nombres/categorías actuales. Atenciones de salón según creador de la cuenta; cada cuenta cobrada cuenta una atención. Los ceros son productos activos sin ventas en los filtros, no prueban que estuvieron disponibles todo el periodo.'};
}
