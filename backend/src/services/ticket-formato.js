// Adaptador de formato puro: UTF-8 de 32/48 columnas para revisar en 58/80 mm.
// El adaptador físico deberá validar codificación, corte y modelo antes de usarse.
export function formatearTicket(contenido, ancho = 80) {
  if (![58, 80].includes(ancho) || contenido?.documento !== 'ticket_interno' || !Array.isArray(contenido.lineas)) throw new Error('Formato de ticket no válido.');
  const columnas = ancho === 58 ? 32 : 48;
  const limpio = v => String(v ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f]/gu, ' ');
  const partir = v => {
    const letras = [...limpio(v)], lineas = [];
    for (let i = 0; i < letras.length; i += columnas) lineas.push(letras.slice(i, i + columnas).join(''));
    return lineas.length ? lineas : [''];
  };
  const lineas = [contenido.titulo, 'TICKET INTERNO - NO FISCAL', contenido.codigo,
    contenido.pedido, contenido.atencion, contenido.fecha, '-'.repeat(columnas)];
  for (const l of contenido.lineas) {
    lineas.push(`${l.cantidad} x ${l.nombre}`, ...(l.variante ? [l.variante] : []),
      ...(l.modificadores ?? []), ...(l.indicaciones ? [`Nota: ${l.indicaciones}`] : []), `S/ ${l.total}`);
  }
  lineas.push('-'.repeat(columnas), `Base: S/ ${contenido.subtotal}`, `Impuesto: S/ ${contenido.impuesto}`, `TOTAL: S/ ${contenido.total}`);
  for (const p of contenido.pagos) lineas.push(`${p.metodo}: S/ ${p.importe}`, ...(p.recibido ? [`Recibido: S/ ${p.recibido}`, `Vuelto: S/ ${p.vuelto}`] : []));
  lineas.push('SIMULACION - NO IMPRESION FISICA', 'Gracias por tu preferencia');
  return lineas.flatMap(partir).join('\n') + '\n';
}
