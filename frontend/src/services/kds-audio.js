// Web Audio nativo: el contexto se crea exclusivamente desde un gesto del usuario.
// No descargar archivos, pedir micrófono ni producir sonido al montar la página.
export function crearAudioKds(Contexto = globalThis.AudioContext ?? globalThis.webkitAudioContext) {
  let contexto, salida, volumen = 35, cerrado = false
  const voces = new Set()
  function detenerVoces() {
    for (const voz of voces) { try { voz.stop() } catch { /* La voz pudo terminar. */ } voz.disconnect() }
    voces.clear()
  }
  return {
    volumen(valor) {
      volumen = Math.max(0, Math.min(100, valor))
      if (salida && contexto.state !== 'closed') salida.gain.setValueAtTime(volumen / 100, contexto.currentTime)
      if (!volumen) detenerVoces()
    },
    async activar() {
      if (cerrado || !Contexto) throw new Error('Este navegador no dispone de audio. Los avisos visuales siguen disponibles.')
      if (!contexto) {
        contexto = new Contexto()
        salida = contexto.createGain(); salida.gain.value = volumen / 100; salida.connect(contexto.destination)
      }
      if (contexto.state !== 'running') await contexto.resume()
      if (cerrado || contexto.state !== 'running') throw new Error('El navegador bloqueó el audio. Vuelve a pulsar Activar y probar sonido.')
    },
    sonar() {
      if (cerrado || !contexto || contexto.state !== 'running' || volumen === 0) return false
      // Agrupar una ráfaga: no superponer avisos ni crear una cola de sonidos.
      if (voces.size) return true
      const voz = contexto.createOscillator(), sobre = contexto.createGain(), inicio = contexto.currentTime
      voz.type = 'sine'; voz.frequency.setValueAtTime(880, inicio)
      sobre.gain.setValueAtTime(0, inicio); sobre.gain.linearRampToValueAtTime(0.22, inicio + 0.015); sobre.gain.linearRampToValueAtTime(0, inicio + 0.25)
      voz.connect(sobre); sobre.connect(salida); voces.add(voz)
      voz.onended = () => { voces.delete(voz); voz.disconnect(); sobre.disconnect() }
      voz.start(inicio); voz.stop(inicio + 0.26)
      return true
    },
    detener: detenerVoces,
    async cerrar() { cerrado = true; detenerVoces(); salida?.disconnect(); if (contexto && contexto.state !== 'closed') await contexto.close() }
  }
}
