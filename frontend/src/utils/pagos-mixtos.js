import { aCentimos, desdeCentimos } from './carrito-calculo.js'

export const METODOS_PAGO = Object.freeze([
  { clave: 'efectivo', nombre: 'Efectivo', icono: 'billete' },
  { clave: 'yape', nombre: 'Yape', icono: 'telefono' },
  { clave: 'plin', nombre: 'Plin', icono: 'telefono' },
  { clave: 'tarjeta_debito', nombre: 'Tarjeta de débito', icono: 'documento' },
  { clave: 'tarjeta_credito', nombre: 'Tarjeta de crédito', icono: 'documento' },
  { clave: 'transferencia', nombre: 'Transferencia', icono: 'billete' },
  { clave: 'puntos_vip', nombre: 'Puntos VIP', icono: 'puntos' }
])
export function importeEntrada(valor) {
  if (typeof valor !== 'string') throw new Error('Escribe un importe válido.')
  // Admitir coma decimal al escribir, sin separadores de miles ni exponentes.
  return aCentimos(valor.trim().replace(',', '.'))
}
export function evaluarPagosMixtos(totalOficial, filas, canje = {}) {
  const total = aCentimos(totalOficial)
  if (total <= 0n || !Array.isArray(filas) || filas.length > 7) throw new Error('El reparto de pagos no es válido.')
  let aplicado = 0n, vuelto = 0n
  const vistos = new Set(), pagos = [], errores = {}
  for (const fila of filas) {
    const error = {}, metodo = fila.metodo
    if (!METODOS_PAGO.some(m => m.clave === metodo) || vistos.has(metodo)) throw new Error('El medio de pago no es válido o está repetido.')
    vistos.add(metodo)
    let monto = null, entregado = null, puntos = null
    if (metodo === 'puntos_vip') {
      if (!canje.disponible) error.puntos = 'El canje no está habilitado para este pedido.'
      else if (!/^\d{1,10}$/.test(fila.puntos ?? '') || Number(fila.puntos) < 1 || Number(fila.puntos) > canje.saldo_puntos || Number(fila.puntos) > 2147483647) error.puntos = 'Indica puntos enteros disponibles en el saldo.'
      else {
        puntos = Number(fila.puntos)
        try {
          monto = aCentimos(canje.valor_punto_pen) * BigInt(puntos)
          if (monto <= 0n || monto > 999999999999n) throw new Error()
        } catch { error.puntos = 'El importe del canje está fuera de rango.'; monto = null }
      }
    } else {
      try { monto = importeEntrada(fila.aplicado); if (monto <= 0n) error.aplicado = 'El importe aplicado debe ser mayor que cero.' }
      catch { error.aplicado = 'Usa un importe con hasta dos decimales.' }
    }
    if (monto !== null) aplicado += monto
    let referencia = ''
    if (metodo === 'efectivo') {
      try {
        entregado = importeEntrada(fila.entregado)
        if (monto !== null && entregado < monto) error.entregado = 'El efectivo recibido no cubre el efectivo aplicado.'
        else if (monto !== null) vuelto = entregado - monto
      } catch { error.entregado = 'Indica cuánto efectivo entregó el cliente.' }
    } else if (metodo !== 'puntos_vip') {
      referencia = (fila.referencia ?? '').trim()
      if ([...referencia].length < 3 || [...referencia].length > 100 || /\p{Cc}/u.test(referencia)) error.referencia = 'Indica una referencia de operación de 3 a 100 caracteres.'
      if (fila.verificado !== true) error.verificado = 'Confirma que verificaste este pago.'
    }
    errores[metodo] = error
    if (!Object.keys(error).length) pagos.push({ metodo_pago: metodo, monto_pagado: desdeCentimos(monto),
      ...(metodo === 'efectivo' ? { monto_entregado: desdeCentimos(entregado) } : metodo === 'puntos_vip' ? { puntos } : { referencia_operacion: referencia, verificado: true }) })
  }
  // El total del pedido está acotado, pero la suma de varios medios puede ser
  // mayor durante la captura. Formatearla sin truncar y sin lanzar en el render.
  const formato = n => `${n / 100n}.${String(n % 100n).padStart(2, '0')}`
  return { errores, pagos, aplicado: formato(aplicado), faltante: formato(total > aplicado ? total - aplicado : 0n),
    exceso: formato(aplicado > total ? aplicado - total : 0n), vuelto: formato(vuelto),
    valido: filas.length > 0 && pagos.length === filas.length && aplicado === total }
}
export function prepararComandoPago(contexto, filas) {
  const { pedido, sesion_caja, canje } = contexto
  if (!sesion_caja || !['abierta', 'bloqueada_en_pago'].includes(pedido.estado_cuenta) ||
    (pedido.estado_cuenta === 'bloqueada_en_pago' && !pedido.bloqueo_propio && !pedido.bloqueo_vencido)) throw new Error('Revisa la cuenta y tu sesión de caja antes de continuar.')
  const resultado = evaluarPagosMixtos(pedido.total, filas, canje)
  if (!resultado.valido) throw new Error('Completa los medios de pago hasta cubrir exactamente el total.')
  return { pedidoId: pedido.id, version: pedido.version, sesion_caja_id: sesion_caja.id, pagos: resultado.pagos }
}
