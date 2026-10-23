import { solicitarApi } from './api.js'

// BIGINT se conserva como texto. Este módulo todavía no expone una escritura
// de cobro: la fase 29 prepara y revisa, la confirmación se conecta en la 30.
export function consultarContextoPago({ id }, signal) {
  if (typeof id !== 'string' || !/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) {
    throw new TypeError('Indica un número de pedido válido.')
  }
  return solicitarApi(`/pedidos/${id}/contexto-pago`, { signal })
}
