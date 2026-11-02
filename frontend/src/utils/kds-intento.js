const llave = usuarioId => `veneziana:kds:intento:${usuarioId}`
// Solo identidad/cuerpo del comando propio, sin cookie, contraseña ni token.
export function leerIntentoKds(usuarioId) {
  const texto = sessionStorage.getItem(llave(usuarioId))
  if (!texto) return null
  const v = JSON.parse(texto)
  if (typeof v?.id !== 'string' || !/^[1-9]\d{0,18}$/.test(v.id) || typeof v.clave !== 'string' || !/^[a-zA-Z0-9_-]{8,64}$/.test(v.clave) || !Number.isSafeInteger(v.datos?.version) || v.datos.version < 1 || !['preparando', 'horno', 'listo_para_entrega', 'entregado', 'cancelado'].includes(v.datos.estado)) throw new Error('El intento guardado necesita revisión antes de continuar.')
  return v
}
export function guardarIntentoKds(usuarioId, intento) { sessionStorage.setItem(llave(usuarioId), JSON.stringify(intento)) }
export function quitarIntentoKds(usuarioId) { sessionStorage.removeItem(llave(usuarioId)) }
