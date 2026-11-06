import { solicitarApi } from './api.js'
import { filtroReporte, validarReporte, MEDIOS_REPORTE, monedaReporte, COLORES_REPORTE } from '../utils/reportes.js'
export async function consultarGerencial({ filtros, financiero }, signal) {
  const f = filtroReporte(filtros), query = new URLSearchParams(f)
  const r = validarReporte(await solicitarApi(`/reportes/${financiero?'resultados':'gerencial'}?${query}`, { signal }))
  if (JSON.stringify(filtroReporte(r.filtros)) !== JSON.stringify(f)) throw new Error('Los filtros recibidos no corresponden a la consulta.')
  return r
}
export async function consultarGastosReporte({ filtros, despues }, signal) {
  const f = filtroReporte(filtros)
  delete f.estado // Un gasto independiente no tiene estado de emisión de venta.
  delete f.canal
  delete f.mesero_id
  const r = await solicitarApi(`/reportes/gastos?${new URLSearchParams({ ...f, limite: '10', ...(despues ? { despues: String(despues) } : {}) })}`, { signal })
  if (!Array.isArray(r?.gastos) || !r.paginacion || !r.gastos.every(g => Number.isSafeInteger(g.id) && g.id > 0 && typeof g.descripcion === 'string' && /^\d+\.\d{2}$/.test(g.monto_gasto) && typeof g.fecha_gasto === 'string' && ['operativo', 'financiero', 'extraordinario', 'provision_impuesto'].includes(g.clasificacion)) || !(r.paginacion.siguiente === null || Number.isSafeInteger(r.paginacion.siguiente) && r.paginacion.siguiente > (despues ?? 0))) throw new Error('Listado de gastos no válido.')
  return r
}
export async function consultarCategoriasReporte(_solicitud, signal) {
  const r = await solicitarApi('/reportes/gastos/categorias', { signal })
  if (!Array.isArray(r?.categorias) || !r.categorias.every(c => Number.isSafeInteger(c.id) && c.id > 0 && typeof c.nombre === 'string')) throw new Error('Categorías de gasto no válidas.')
  return r.categorias
}
export function descargarReporte(contenido, tipo, nombre) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a'); a.href = url; a.download = nombre; a.click()
  // Esperar a que el navegador acepte la descarga antes de liberar la URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
// El PNG debe entenderse fuera de la web: título, filtros, fecha y leyenda
// exacta se dibujan en el archivo, no depender de una leyenda HTML externa.
export function imagenReporte(canvas, reporte, tipo, oscuro) {
  const salida = document.createElement('canvas'), ancho = 1000
  const leyenda = tipo === 'medios' ? reporte.medios.filter(m => m.cobrado !== '0.00').map(m => `${MEDIOS_REPORTE[m.metodo]}: ${monedaReporte(m.cobrado)}`) : [`Total de ventas: ${monedaReporte(reporte.ventas.total)}`]
  const altoGrafico = Math.round(canvas.height / canvas.width * ancho)
  salida.width = ancho; salida.height = 160 + altoGrafico + leyenda.length * 32
  const ctx = salida.getContext('2d')
  ctx.fillStyle = oscuro ? '#1b2028' : '#ffffff'; ctx.fillRect(0, 0, salida.width, salida.height)
  ctx.fillStyle = oscuro ? '#f8fafc' : '#0f172a'; ctx.font = 'bold 24px Arial'
  ctx.fillText(`La Veneziana · ${tipo === 'medios' ? 'Cobros por medio' : 'Ventas por día'}`, 24, 36)
  ctx.font = '16px Arial'; ctx.fillText(`${reporte.filtros.desde} a ${reporte.filtros.hasta} · ${reporte.filtros.estado} · ${reporte.filtros.zona_horaria} · PEN · sesión ${reporte.filtros.sesion_id ?? 'todas'} · canal ${reporte.filtros.canal??'todos'} · responsable ${reporte.filtros.mesero_id??'todos'}`, 24, 66,950)
  ctx.drawImage(canvas, 0, 84, ancho, altoGrafico)
  ctx.font = '18px Arial'; leyenda.forEach((s, i) => {
    const y = 112 + altoGrafico + i * 32
    ctx.fillStyle = COLORES_REPORTE[i % COLORES_REPORTE.length]; ctx.fillRect(24, y - 14, 14, 14)
    ctx.fillStyle = oscuro ? '#f8fafc' : '#0f172a'; ctx.fillText(s, 48, y, ancho - 72)
  })
  ctx.font = '13px Arial'; ctx.fillText(`Consulta: ${reporte.consultado_en} · Escala visual aproximada; importes exactos en CSV.`, 24, salida.height - 16)
  return salida.toDataURL('image/png')
}
