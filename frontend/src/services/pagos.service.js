import { solicitarApi } from './api.js'

// BIGINT se conserva como texto. Las escrituras pasan por el registro durable
// comercial para recuperar su identidad ante desconexión o recarga.
export function consultarContextoPago({ id }, signal) {
  if (typeof id !== 'string' || !/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) {
    throw new TypeError('Indica un número de pedido válido.')
  }
  return solicitarApi(`/pedidos/${id}/contexto-pago`, { signal })
}
