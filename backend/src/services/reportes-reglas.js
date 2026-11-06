import { campos, texto, idEntero, centimos, dinero, exigirPedido as exigir } from './pedidos-calculo.js';
export const CLASES_GASTO = ['operativo', 'financiero', 'extraordinario', 'provision_impuesto'];
export function fechaReporte(v) {
  exigir(typeof v === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(v));
  const ms = Date.parse(`${v}T00:00:00Z`);
  exigir(Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === v);
  return ms;
}
// Periodos civiles inclusivos; SQL usa [inicio, fin) en UTC. No usar zona del SO.
export function filtrosReporte(q, gastos = false) {
  campos(q, ['desde', 'hasta', 'sesion_id', 'moneda', 'zona_horaria', ...(gastos ? ['clasificacion', 'despues', 'limite'] : ['estado','canal','mesero_id'])]);
  const a = fechaReporte(q.desde), b = fechaReporte(q.hasta);
  exigir(a <= b && b - a < 366 * 86400000);
  const zona = q.zona_horaria ?? 'America/Lima', moneda = q.moneda ?? 'PEN';
  exigir(['America/Lima', 'UTC'].includes(zona) && moneda === 'PEN');
  exigir(q.sesion_id === undefined || (typeof q.sesion_id === 'string' && /^[1-9]\d{0,9}$/.test(q.sesion_id) && idEntero(Number(q.sesion_id))));
  const estado = q.estado ?? 'emitida'; exigir(gastos || ['emitida', 'anulada', 'rechazada_sunat', 'todos'].includes(estado));
  const canal=q.canal??'todos'; exigir(['todos','salon','llevar','delivery'].includes(canal));
  exigir(q.mesero_id===undefined||(typeof q.mesero_id==='string'&&/^[1-9]\d{0,9}$/.test(q.mesero_id)&&idEntero(Number(q.mesero_id))));
  const offset = zona === 'America/Lima' ? 5 * 3600000 : 0;
  const sql = ms => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
  const f = { desde: q.desde, hasta: q.hasta, sesion_id: q.sesion_id === undefined ? null : Number(q.sesion_id), moneda, zona_horaria: zona, estado,
    inicio: sql(a + offset), fin: sql(b + 86400000 + offset), offset: zona === 'America/Lima' ? '-05:00' : '+00:00',canal,mesero_id:q.mesero_id===undefined?null:Number(q.mesero_id) };
  if (gastos) {
    exigir(q.clasificacion === undefined || CLASES_GASTO.includes(q.clasificacion));
    const limite = q.limite === undefined ? 50 : Number(q.limite), despues = q.despues === undefined ? 0 : Number(q.despues);
    exigir((q.limite === undefined || /^\d{1,3}$/.test(q.limite) && typeof q.limite === 'string') && Number.isInteger(limite) && limite >= 1 && limite <= 100);
    exigir(q.despues === undefined || typeof q.despues === 'string' && /^[1-9]\d{0,9}$/.test(q.despues) && idEntero(despues));
    Object.assign(f, { clasificacion: q.clasificacion ?? null, limite, despues });
  }
  return f;
}
export function validarGasto(datos) {
  campos(datos, ['categoria_id', 'descripcion', 'monto_gasto', 'fecha_gasto', 'clasificacion', 'movimiento_caja_id', 'comprobante_fiscal']);
  exigir(idEntero(datos.categoria_id) && CLASES_GASTO.includes(datos.clasificacion));
  fechaReporte(datos.fecha_gasto);
  const monto = dinero(centimos(datos.monto_gasto)), descripcion = texto(datos.descripcion, 255), comprobante = texto(datos.comprobante_fiscal, 50);
  exigir(centimos(monto) > 0n && descripcion.length >= 3 && (datos.movimiento_caja_id == null || idEntero(datos.movimiento_caja_id)));
  return { categoria_id: datos.categoria_id, descripcion, monto_gasto: monto, fecha_gasto: datos.fecha_gasto, clasificacion: datos.clasificacion,
    movimiento_caja_id: datos.movimiento_caja_id ?? null, comprobante_fiscal: comprobante || null };
}
// SUM de SQL DECIMAL puede superar una columna individual; conservar precisión
// y signo sin convertir dinero agregado a Number ni imponer el límite por venta.
export function decimalReporte(v, escala = 2) {
  const s = String(v ?? '0'); exigir(/^-?\d+(?:\.\d+)?$/.test(s), 'REPORTE_INCONSISTENTE');
  const negativo = s.startsWith('-'), [a, b = ''] = (negativo ? s.slice(1) : s).split('.');
  exigir(b.length <= escala || /^0*$/.test(b.slice(escala)), 'REPORTE_INCONSISTENTE');
  return (negativo ? -1n : 1n) * (BigInt(a) * 10n ** BigInt(escala) + BigInt(b.slice(0, escala).padEnd(escala, '0')));
}
export function formatoReporte(n, escala = 2) {
  const signo = n < 0n ? '-' : '', a = n < 0n ? -n : n, factor = 10n ** BigInt(escala);
  return `${signo}${a / factor}.${String(a % factor).padStart(escala, '0')}`;
}
