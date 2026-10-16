import { solicitarApi } from './api.js'
export function consultarInventario({ pagina = 1, busqueda = '', alerta = 'todos' }, signal) {
  return solicitarApi(`/inventario?${new URLSearchParams({ pagina: String(pagina), limite: '20', busqueda, alerta })}`, { signal })
}
export function consultarDetalleInventario({ id, tipo, pagina = 1 }, signal) {
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new TypeError('Identificador de inventario no válido.')
  return solicitarApi(`/inventario/${tipo === 'producto' ? 'productos/' : ''}${id}?pagina=${pagina}&limite=10`, { signal })
}
