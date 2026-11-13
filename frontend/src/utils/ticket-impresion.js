// Aislar el ticket del menú, los modales y los estilos del tema de la aplicación.
// Copiar nodos de texto evita interpretar nombres o notas del catálogo como HTML.
export async function imprimirTicket(contenido, ancho = 80) {
  if (![58, 80].includes(ancho) || !contenido) throw new Error('Selecciona un formato de ticket válido.')
  if (document.getElementById('vz-ticket-impresion')) throw new Error('Hay un ticket listo para imprimir. Cierra primero ese diálogo.')
  const marco = document.createElement('iframe')
  const focoAnterior = document.activeElement
  marco.id = 'vz-ticket-impresion'
  marco.title = 'Impresión del ticket'
  Object.assign(marco.style, { position: 'fixed', left: '-10000px', top: '0', width: `${ancho}mm`, height: '900px', border: '0' })
  document.body.append(marco)
  const doc = marco.contentDocument
  // Un documento estándar mantiene idéntico el cálculo de cajas en pantalla y PDF.
  doc.open()
  doc.write('<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body></body></html>')
  doc.close()
  const estilo = doc.createElement('style')
  estilo.textContent = `@page { size: ${ancho}mm auto; margin: 0; }
    * { box-sizing: border-box; } html,body { margin:0; padding:0; background:#fff; color:#000; }
    body { width:${ancho}mm; padding:3mm; font:12px/1.4 monospace; }
    article,header,footer { display:flow-root; }
    h3 { font-size:17px; margin:0 0 5px; } p { margin:4px 0; }
    header,footer { text-align:center; } section { border-top:1px dashed #000; margin-top:10px; padding-top:8px; }
    .ticket-fila { display:flex; justify-content:space-between; gap:8px; }
    .ticket-fila > :last-child { white-space:nowrap; } .ticket-total { font-size:16px; font-weight:bold; }
    .ticket-texto { overflow-wrap:anywhere; } .ticket-linea { break-inside:avoid; margin-bottom:10px; }
    ul { margin:3px 0; padding-left:15px; }`
  doc.head.append(estilo)
  doc.title = 'La Veneziana - Ticket'
  const copia = contenido.cloneNode(true)
  copia.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))
  doc.body.append(copia)
  let limpieza
  const limpiar = () => { clearTimeout(limpieza); marco.remove(); if (focoAnterior?.isConnected) focoAnterior.focus() }
  marco.contentWindow.addEventListener('afterprint', limpiar, { once: true })
  try {
    await doc.fonts.ready
    // Medir el papel completo permite guardar un PDF térmico sin páginas A4.
    const alto = Math.ceil(copia.getBoundingClientRect().height * 25.4 / 96) + 6
    estilo.textContent += `@page { size:${ancho}mm ${Math.max(80, alto)}mm; }`
    // Respaldo para navegadores que no emiten afterprint al cancelar.
    limpieza = setTimeout(limpiar, 300000)
    marco.contentWindow.focus()
    marco.contentWindow.print()
  } catch (e) { limpiar(); throw e }
}
