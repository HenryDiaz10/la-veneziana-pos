export const UMBRALES_KDS = Object.freeze({ espera: 10, preparando: 15, horno: 10, listo_para_entrega: 5 })
const inicios = { espera: 'enviado_en', preparando: 'iniciado_en', horno: 'horno_en', listo_para_entrega: 'listo_en' }
export function muestraServidor(fecha, monotono) {
  const servidor = typeof fecha === 'string' ? Date.parse(fecha) : NaN
  if (!Number.isFinite(servidor) || !Number.isFinite(monotono)) throw new Error('Hora del servidor no válida.')
  return { servidor, monotono }
}
// Una muestra oficial y un reloj monotónico: cambiar el reloj de Windows no
// altera los segundos transcurridos. La red y la suspensión limitan la precisión.
export function ahoraServidor(muestra, monotono) {
  return muestra && Number.isFinite(monotono) ? muestra.servidor + Math.max(0, monotono - muestra.monotono) : null
}
export function segundosDesde(fecha, ahora) {
  const inicio = typeof fecha === 'string' ? Date.parse(fecha) : NaN
  return Number.isFinite(inicio) && Number.isFinite(ahora) && inicio <= ahora ? Math.floor((ahora - inicio) / 1000) : null
}
export function formatoTiempo(segundos) {
  if (!Number.isFinite(segundos) || segundos < 0) return '—'
  const s = Math.floor(segundos), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
export function tiempoTareaKds(tarea, ahora, umbrales) {
  const etapa = segundosDesde(tarea[inicios[tarea.estado]], ahora), total = segundosDesde(tarea.enviado_en, ahora)
  return { etapa, total, excedido: etapa !== null && etapa >= umbrales[tarea.estado] * 60 }
}
export function preferenciasKds(valor) {
  const umbrales = Object.fromEntries(Object.entries(UMBRALES_KDS).map(([k, defecto]) => [k,
    Number.isInteger(valor?.umbrales?.[k]) && valor.umbrales[k] >= 1 && valor.umbrales[k] <= 180 ? valor.umbrales[k] : defecto]))
  return { volumen: Number.isInteger(valor?.volumen) && valor.volumen >= 0 && valor.volumen <= 100 ? valor.volumen : 35, umbrales }
}
// No avisar por la primera carga, reconexión, recarga ni tareas ya vistas.
export function detectarNuevasKds(vistas, tareas, anunciar) {
  const nuevas = tareas.filter(t => !vistas.has(t.id))
  for (const t of tareas) vistas.add(t.id)
  while (vistas.size > 10000) vistas.delete(vistas.values().next().value)
  return anunciar ? nuevas.length : 0
}
