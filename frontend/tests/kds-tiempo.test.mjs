import test from 'node:test'
import assert from 'node:assert/strict'
import { muestraServidor, ahoraServidor, segundosDesde, formatoTiempo, tiempoTareaKds, preferenciasKds, detectarNuevasKds, UMBRALES_KDS } from '../src/utils/kds-tiempo.js'
import { crearAudioKds } from '../src/services/kds-audio.js'
test('reloj compartido anclado al servidor y monotónico, sin depender del reloj del sistema', () => {
  const m = muestraServidor('2026-11-02T12:00:00Z', 1000)
  assert.equal(ahoraServidor(m, 61000), Date.parse('2026-11-02T12:01:00Z'))
  assert.equal(ahoraServidor(m, 500), m.servidor)
  assert.equal(ahoraServidor(null, 1000), null)
  assert.throws(() => muestraServidor('fecha inválida', 0))
})
test('horno tiene su propio inicio; total, umbrales y horas no se confunden', () => {
  const t = { estado: 'horno', enviado_en: '2026-11-02T12:00:00Z', iniciado_en: '2026-11-02T12:10:00Z', horno_en: '2026-11-02T12:20:00Z' }
  const x = tiempoTareaKds(t, Date.parse('2026-11-02T12:25:00Z'), UMBRALES_KDS)
  assert.equal(x.etapa, 300); assert.equal(x.total, 1500); assert.equal(x.excedido, false)
  assert.equal(tiempoTareaKds(t, Date.parse('2026-11-02T12:30:00Z'), UMBRALES_KDS).excedido, true)
  assert.equal(formatoTiempo(3661), '1:01:01'); assert.equal(formatoTiempo(59), '00:59')
})
test('fechas ausentes/adelantadas y hora aún no confirmada no inventan un inicio', () => {
  assert.equal(segundosDesde(null, Date.now()), null)
  assert.equal(segundosDesde('2026-11-02T12:01:00Z', Date.parse('2026-11-02T12:00:00Z')), null)
  assert.equal(segundosDesde('2026-11-02T12:00:00Z', null), null)
  assert.equal(formatoTiempo(null), '—')
  assert.equal(tiempoTareaKds({ estado: 'horno', enviado_en: '2026-11-02T12:00:00Z' }, Date.parse('2026-11-02T12:30:00Z'), UMBRALES_KDS).excedido, false)
})
test('preferencias acotadas, sin copiar secretos ni configuraciones inválidas', () => {
  const p = preferenciasKds({ volumen: 100, umbrales: { espera: 180, horno: 0, preparando: 2.5 }, secreto: 'NO' })
  assert.equal(p.volumen, 100); assert.equal(p.umbrales.espera, 180); assert.equal(p.umbrales.horno, 10); assert.equal(p.umbrales.preparando, 15)
  assert.equal(preferenciasKds({ volumen: NaN }).volumen, 35); assert.ok(!JSON.stringify(p).includes('NO'))
})
test('primera carga/reconexión sin alarma; tareas/versiones repetidas no se anuncian', () => {
  const vistas = new Set()
  assert.equal(detectarNuevasKds(vistas, [{ id: '1' }, { id: '2' }], false), 0)
  assert.equal(detectarNuevasKds(vistas, [{ id: '1', version: 9 }, { id: '2' }, { id: '3' }], true), 1)
  assert.equal(detectarNuevasKds(vistas, [{ id: '3' }], true), 0)
  assert.equal(detectarNuevasKds(vistas, [{ id: '4' }], false), 0)
  assert.equal(detectarNuevasKds(vistas, [{ id: '4' }, { id: '5' }], true), 1)
})
class ContextoPrueba {
  static creados = []
  constructor() { ContextoPrueba.creados.push(this); this.state = 'suspended'; this.currentTime = 0; this.destination = {}; this.voces = [] }
  createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} } }
  createOscillator() { const v = { frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() { this.iniciada = true }, stop() { this.detenida = true } }; this.voces.push(v); return v }
  async resume() { this.state = 'running' }
  async close() { this.state = 'closed' }
}
test('audio solo se crea al activar, agrupa ráfagas y se detiene al silenciar/cerrar', async () => {
  ContextoPrueba.creados = []
  const audio = crearAudioKds(ContextoPrueba)
  assert.equal(ContextoPrueba.creados.length, 0); assert.equal(audio.sonar(), false)
  await audio.activar(); const c = ContextoPrueba.creados[0]
  assert.equal(audio.sonar(), true); assert.equal(audio.sonar(), true); assert.equal(c.voces.length, 1)
  c.voces[0].onended(); audio.volumen(0); assert.equal(audio.sonar(), false)
  audio.volumen(50); assert.equal(audio.sonar(), true)
  audio.detener(); assert.ok(c.voces.at(-1).detenida)
  await audio.cerrar(); assert.equal(c.state, 'closed'); assert.equal(audio.sonar(), false); await assert.rejects(audio.activar())
})
test('audio no compatible o bloqueado falla de forma controlada', async () => {
  const sinAudio = crearAudioKds(null); await assert.rejects(sinAudio.activar(), /no dispone/)
  class Bloqueado extends ContextoPrueba { async resume() {} }
  const bloqueado = crearAudioKds(Bloqueado); await assert.rejects(bloqueado.activar(), /bloqueó/); assert.equal(bloqueado.sonar(), false); await bloqueado.cerrar()
})
