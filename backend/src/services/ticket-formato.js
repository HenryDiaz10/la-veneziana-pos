// Adaptador de formato puro: UTF-8 de 32/48 columnas para revisar en 58/80 mm.
// El adaptador físico deberá validar codificación, corte y modelo antes de usarse.
function lineasTermicas(lineas, ancho) {
  if (![58, 80].includes(ancho)) throw new Error('Ancho de impresión no válido.');
  const columnas = ancho === 58 ? 32 : 48;
  const limpio = v => String(v ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f]/gu, ' ');
  const partir = v => {
    const letras = [...limpio(v)], lineas = [];
    for (let i = 0; i < letras.length; i += columnas) lineas.push(letras.slice(i, i + columnas).join(''));
    return lineas.length ? lineas : [''];
  };
  return lineas.flatMap(partir).join('\n') + '\n';
}
export function formatearTicket(contenido, ancho = 80) {
  if (contenido?.documento !== 'ticket_interno' || !Array.isArray(contenido.lineas)) throw new Error('Formato de ticket no válido.');
  const columnas = ancho === 58 ? 32 : 48;
  const lineas = [contenido.titulo, 'TICKET INTERNO - NO FISCAL', contenido.codigo,
    contenido.pedido, contenido.atencion, contenido.fecha, '-'.repeat(columnas)];
  for (const l of contenido.lineas) {
    lineas.push(`${l.cantidad} x ${l.nombre}`, ...(l.variante ? [l.variante] : []),
      ...(l.modificadores ?? []), ...(l.indicaciones ? [`Nota: ${l.indicaciones}`] : []), `S/ ${l.total}`);
  }
  lineas.push('-'.repeat(columnas), `Base: S/ ${contenido.subtotal}`, `Impuesto: S/ ${contenido.impuesto}`, `TOTAL: S/ ${contenido.total}`);
  for (const p of contenido.pagos) lineas.push(`${p.metodo}: S/ ${p.importe}`, ...(p.recibido ? [`Recibido: S/ ${p.recibido}`, `Vuelto: S/ ${p.vuelto}`] : []));
  lineas.push('SIMULACION - NO IMPRESION FISICA', 'Gracias por tu preferencia');
  return lineasTermicas(lineas, ancho);
}
export function formatearCierre(contenido, ancho = 80) {
  const r = contenido?.snapshot;
  if (contenido?.documento !== 'cierre_caja' || !r?.cierre || !r.totales || !Number.isInteger(contenido.numero_copia) || contenido.numero_copia < 0) throw new Error('Cierre sin snapshot válido.');
  const t = r.totales;
  const lineas = [contenido.titulo, 'CIERRE DE CAJA - INFORME INTERNO',
    contenido.numero_copia ? `COPIA ${contenido.numero_copia}` : 'ORIGINAL',
    `Sesion: ${r.sesion.id}`, `Usuario solicitante: ${contenido.usuario_id}`, `Corte UTC: ${r.corte_utc}`,
    `Apertura: S/ ${t.apertura}`, `Efectivo aplicado: S/ ${t.cobrado_por_metodo.efectivo}`,
    `Ingresos: S/ ${t.ingresos}`, `Egresos: S/ ${t.egresos}`,
    `Devuelto efectivo: S/ ${t.devuelto_por_metodo.efectivo}`, `TEORICO: S/ ${t.teorico_efectivo}`,
    `CONTADO: S/ ${r.cierre.contado}`, `DESCUADRE: S/ ${r.cierre.descuadre}`, 'NETOS POR MEDIO'];
  for (const [medio, monto] of Object.entries(t.neto_por_metodo)) lineas.push(`${medio}: S/ ${monto}`);
  if (r.cierre.observaciones) lineas.push(`Observaciones: ${r.cierre.observaciones}`);
  lineas.push('SIMULACION - NO IMPRESION FISICA', 'SIN APERTURA DE CAJON');
  return lineasTermicas(lineas, ancho);
}
