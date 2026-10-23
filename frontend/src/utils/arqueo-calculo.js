import { importeEntrada } from './pagos-mixtos.js'
import { desdeCentimos } from './carrito-calculo.js'

// Valores nominales de ayuda al conteo, sin redondear el importe informado.
export const DENOMINACIONES = Object.freeze([
  { centimos: 20000, nombre: 'S/ 200' }, { centimos: 10000, nombre: 'S/ 100' },
  { centimos: 5000, nombre: 'S/ 50' }, { centimos: 2000, nombre: 'S/ 20' },
  { centimos: 1000, nombre: 'S/ 10' }, { centimos: 500, nombre: 'S/ 5' },
  { centimos: 200, nombre: 'S/ 2' }, { centimos: 100, nombre: 'S/ 1' },
  { centimos: 50, nombre: 'S/ 0.50' }, { centimos: 20, nombre: 'S/ 0.20' }, { centimos: 10, nombre: 'S/ 0.10' }
])
export const idSesionValido = id => typeof id === 'string' && /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 2147483647
export function calcularConteo({ modo, importe, cantidades = {}, otros = '' }) {
  if (modo === 'importe') {
    if (!importe?.trim()) throw new Error('Indica el efectivo contado; escribe 0 si no hay efectivo.')
    return desdeCentimos(importeEntrada(importe))
  }
  if (modo !== 'denominaciones') throw new Error('Forma de conteo no válida.')
  let total = 0n, capturado = Boolean(otros.trim())
  for (const d of DENOMINACIONES) {
    const texto = cantidades[d.centimos] ?? ''
    if (!texto) continue
    capturado = true
    if (!/^\d{1,6}$/.test(texto)) throw new Error(`Indica una cantidad entera de hasta seis dígitos para ${d.nombre}.`)
    total += BigInt(texto) * BigInt(d.centimos)
  }
  if (!capturado) throw new Error('Completa el conteo; escribe una cantidad 0 para confirmar una caja vacía.')
  if (otros.trim()) total += importeEntrada(otros)
  return desdeCentimos(total)
}
export function prepararCierre(datos, conteo, observaciones) {
  const r = datos?.resumen
  if (datos?.estado !== 'abierta' || !Number.isSafeInteger(r?.sesion?.id) || !/^[a-f0-9]{64}$/.test(datos.revision)) throw new Error('Actualiza una sesión abierta antes de revisar el cierre.')
  if (typeof observaciones !== 'string' || [...observaciones].length > 500) throw new Error('Las observaciones admiten hasta 500 caracteres.')
  return { sesionId: r.sesion.id, cuerpo: { cierre_real_efectivo: calcularConteo(conteo), revision: datos.revision, observaciones: observaciones.trim() } }
}
