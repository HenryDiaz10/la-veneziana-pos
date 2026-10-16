export const ALERTAS = {
  normal: { texto: 'Disponible', variante: 'exito' }, bajo: { texto: 'Stock bajo', variante: 'advertencia' },
  agotado: { texto: 'Sin disponible', variante: 'peligro' }, quiebre: { texto: 'Quiebre declarado', variante: 'peligro' },
  inactivo: { texto: 'Inactivo', variante: 'neutro' }
}
export const TIPOS = { INGRESO_COMPRA: 'Ingreso por compra', INGRESO_AJUSTE: 'Ingreso por ajuste',
  SALIDA_VENTA: 'Salida por venta', SALIDA_MERMA: 'Salida por merma', SALIDA_AJUSTE: 'Salida por ajuste' }
// Conservar los decimales del servidor, incluso en sumas históricas grandes.
export function cantidad(valor) {
  const [entero, decimales = ''] = String(valor ?? '0').split('.')
  return `${entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimales.padEnd(4, '0')}`
}
export const fecha = valor => valor ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(valor)) : 'Sin fecha'
