// Preparar una copia de la vista actual con imágenes de sus gráficos. Así el
// diálogo de impresión no redimensiona Chart.js ni incluye otras vistas/menús.
export async function imprimirVistaReporte({contenido,titulo,vista,reporte,onFinalizar}) {
  if(!contenido||document.getElementById('vz-reporte-impresion'))throw new Error('Espera a que termine la exportación anterior.')
  const salida=document.createElement('article')
  salida.id='vz-reporte-impresion';salida.className='vz-reportes vz-report-exportacion'
  const cabecera=document.createElement('header'),marca=document.createElement('p'),nombre=document.createElement('h1'),periodo=document.createElement('p'),filtros=document.createElement('p')
  marca.textContent='LA VENEZIANA · REPORTE ADMINISTRATIVO'
  nombre.textContent=`${titulo} · ${vista}`
  periodo.textContent=`Periodo: ${reporte.filtros.desde} al ${reporte.filtros.hasta} · PEN · ${reporte.filtros.zona_horaria}`
  filtros.textContent=`Ventas: ${reporte.filtros.estado} · Canal: ${reporte.filtros.canal??'todos'} · Sesión: ${reporte.filtros.sesion_id??'todas'} · Responsable: ${reporte.filtros.mesero_id??'todos'}`
  cabecera.append(marca,nombre,periodo,filtros)
  const copia=contenido.cloneNode(true),originales=[...contenido.querySelectorAll('canvas')]
  copia.querySelectorAll('canvas').forEach((lienzo,i)=>{
    const imagen=document.createElement('img')
    imagen.src=originales[i].toDataURL('image/png');imagen.alt=originales[i].getAttribute('aria-label')??'Gráfico del reporte'
    imagen.className='vz-report-imagen-pdf';lienzo.replaceWith(imagen)
  })
  copia.querySelectorAll('button,input,select,.vz-no-print').forEach(el=>el.remove())
  // No duplicar IDs del contenido vivo ni alterar sus desplegables originales.
  copia.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'))
  const pie=document.createElement('p');pie.className='vz-report-pie-pdf'
  pie.textContent=`Consulta: ${new Date(reporte.consultado_en).toLocaleString('es-PE',{timeZone:reporte.filtros.zona_horaria})}. Vista: ${vista}. Las tablas corresponden a los registros cargados; los detalles desplegados se incluyen en el PDF.`
  salida.append(cabecera,copia,pie)
  const tituloAnterior=document.title
  let terminado=false
  function limpiar(){
    if(terminado)return
    terminado=true;salida.remove();document.body.classList.remove('vz-imprimiendo-vista');document.title=tituloAnterior
    window.removeEventListener('afterprint',limpiar);onFinalizar?.()
  }
  document.title=`La Veneziana - ${titulo} - ${vista} - ${reporte.filtros.desde} a ${reporte.filtros.hasta}`
  document.body.append(salida);document.body.classList.add('vz-imprimiendo-vista')
  window.addEventListener('afterprint',limpiar)
  try{
    // Esperar la decodificación evita imprimir cuadros vacíos por imágenes que
    // todavía no estaban listas al abrir el diálogo del navegador.
    await Promise.all([...salida.querySelectorAll('img')].map(img=>img.decode()))
    await document.fonts.ready
    window.print()
  }catch(e){limpiar();throw e}
}
