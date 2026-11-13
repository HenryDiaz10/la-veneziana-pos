import {decimalReporte as valor,formatoReporte as formato} from './reportes-reglas.js';
import {exigirPedido as exigir} from './pedidos-calculo.js';

// Agregar cabeceras, unidades y primera compra por separado: los pagos mixtos
// y los detalles nunca deben multiplicar el importe o la frecuencia de un cliente.
export async function analiticaClientes(leer, ventas, filtros) {
  const seleccion=`${ventas} AND v.estado_emision<>'anulada'`;
  const filas=await leer(`SELECT p.cliente_id,COALESCE(NULLIF(TRIM(CONCAT_WS(' ',c.nombres,c.apellidos)),''),'Cliente sin ficha') nombre,
    COUNT(*) compras,COUNT(DISTINCT DATE(CONVERT_TZ(v.fecha_emision,'+00:00',:offset))) dias,
    SUM(v.total_final_venta) bruto,MAX(v.fecha_emision) ultima_compra,
    SUM((SELECT COALESCE(SUM(d.total),0) FROM ventas_devoluciones d WHERE d.venta_id=v.id)) devuelto
    FROM ventas_comprobantes v JOIN pedidos_master p ON p.id=v.pedido_id LEFT JOIN clientes c ON c.id=p.cliente_id
    WHERE ${seleccion} GROUP BY p.cliente_id,c.nombres,c.apellidos ORDER BY p.cliente_id`);
  const unidades=await leer(`SELECT p.cliente_id,COALESCE(SUM(d.cantidad),0) unidades
    FROM ventas_detalle_snapshot d JOIN ventas_comprobantes v ON v.id=d.venta_id JOIN pedidos_master p ON p.id=v.pedido_id
    WHERE ${seleccion} AND p.cliente_id IS NOT NULL GROUP BY p.cliente_id`);
  // Primera compra real del cliente: cualquier canal, sesión o responsable,
  // no solo su primer ticket dentro del periodo seleccionado.
  const primeras=await leer(`SELECT ph.cliente_id,MIN(vh.fecha_emision) primera_compra
    FROM ventas_comprobantes vh JOIN pedidos_master ph ON ph.id=vh.pedido_id
    WHERE vh.estado_emision<>'anulada' AND ph.cliente_id IN
      (SELECT DISTINCT p.cliente_id FROM ventas_comprobantes v JOIN pedidos_master p ON p.id=v.pedido_id
       WHERE ${seleccion} AND p.cliente_id IS NOT NULL)
    GROUP BY ph.cliente_id`);
  const meses=Date.parse(filtros.hasta)-Date.parse(filtros.desde)>62*86400000;
  const periodo=meses?"DATE_FORMAT(CONVERT_TZ(v.fecha_emision,'+00:00',:offset),'%Y-%m')":"DATE(CONVERT_TZ(v.fecha_emision,'+00:00',:offset))";
  const evolucion=await leer(`SELECT ${periodo} fecha,COUNT(DISTINCT p.cliente_id) clientes,COUNT(*) compras
    FROM ventas_comprobantes v JOIN pedidos_master p ON p.id=v.pedido_id
    WHERE ${seleccion} AND p.cliente_id IS NOT NULL GROUP BY fecha ORDER BY fecha`);
  const productos=await leer(`SELECT d.descripcion_snapshot nombre,SUM(d.cantidad) unidades
    FROM ventas_detalle_snapshot d JOIN ventas_comprobantes v ON v.id=d.venta_id JOIN pedidos_master p ON p.id=v.pedido_id
    WHERE ${seleccion} AND p.cliente_id IS NOT NULL GROUP BY d.descripcion_snapshot
    ORDER BY unidades DESC,d.descripcion_snapshot LIMIT 10`);
  const entero=v=>{const n=Number(v);exigir(Number.isSafeInteger(n)&&n>=0,'REPORTE_INCONSISTENTE');return n;};
  const mapaUnidades=new Map(unidades.map(u=>[Number(u.cliente_id),String(u.unidades)]));
  const mapaPrimeras=new Map(primeras.map(p=>[Number(p.cliente_id),new Date(p.primera_compra).toISOString()]));
  const inicio=Date.parse(filtros.inicio.replace(' ','T')+'Z');
  const conocidos=filas.filter(c=>c.cliente_id!==null).map(c=>{
    const id=entero(c.cliente_id),compras=entero(c.compras),neto=valor(c.bruto)-valor(c.devuelto);
    exigir(id>0&&compras>0&&neto>=0n&&mapaPrimeras.has(id),'REPORTE_INCONSISTENTE');
    return {id,nombre:c.nombre,compras,dias:entero(c.dias),unidades:mapaUnidades.get(id)??'0',bruto:formato(valor(c.bruto)),devuelto:formato(valor(c.devuelto)),neto:formato(neto),
      promedio_neto:formato((neto+BigInt(compras)/2n)/BigInt(compras)),primera_compra:mapaPrimeras.get(id),ultima_compra:new Date(c.ultima_compra).toISOString(),nuevo:Date.parse(mapaPrimeras.get(id))>=inicio};
  });
  const anonimo=filas.find(c=>c.cliente_id===null),activos=conocidos.length;
  const compras=conocidos.reduce((s,c)=>s+c.compras,0),sinCliente=entero(anonimo?.compras??0);
  const recurrentes=conocidos.filter(c=>c.compras>=2).length,nuevos=conocidos.filter(c=>c.nuevo).length;
  const porcentaje=(n,d)=>d?formato((BigInt(n)*10000n+BigInt(d)/2n)/BigInt(d)):'0.00';
  const ordenar=(a,b,campo)=>{const x=valor(a[campo]),y=valor(b[campo]);return x===y?a.id-b.id:x>y?-1:1;};
  return {version:1,resumen:{activos,nuevos,regresaron:activos-nuevos,recurrentes,una_compra:activos-recurrentes,
    compras_identificadas:compras,compras_sin_cliente:sinCliente,ingreso_neto:formato(conocidos.reduce((s,c)=>s+valor(c.neto),0n)),
    ingreso_sin_cliente:formato(valor(anonimo?.bruto)-valor(anonimo?.devuelto)),recompra_porcentaje:porcentaje(recurrentes,activos),identificacion_porcentaje:porcentaje(compras,compras+sinCliente),
    compras_por_cliente:activos?formato((BigInt(compras)*100n+BigInt(activos)/2n)/BigInt(activos)):'0.00'},
    ranking_ingresos:[...conocidos].sort((a,b)=>ordenar(a,b,'neto')).slice(0,20),
    ranking_frecuencia:[...conocidos].sort((a,b)=>b.compras-a.compras||ordenar(a,b,'neto')).slice(0,10),
    ranking_unidades:[...conocidos].sort((a,b)=>BigInt(a.unidades)===BigInt(b.unidades)?a.id-b.id:BigInt(a.unidades)>BigInt(b.unidades)?-1:1).slice(0,10),
    evolucion:evolucion.map(e=>({fecha:String(e.fecha),clientes:entero(e.clientes),compras:entero(e.compras)})),granularidad:meses?'mes':'dia',
    productos:productos.map(p=>({nombre:p.nombre,unidades:String(p.unidades)})),
    alcance:'Compras cobradas no anuladas en los filtros. Ingreso neto: venta con impuesto menos sus devoluciones acumuladas a la consulta. Frecuencia: tickets, no visitas físicas. Unidades brutas del detalle histórico, sin restar devoluciones. Cliente nuevo: su primera compra histórica ocurre en el periodo; nombres actuales de la ficha.'};
}
