// Sesión de turno: ocho horas aunque no haya interacción, sin plazo deslizante.
// Se comprueban en el servidor; el navegador no decide si una sesión es válida.
export const POLITICA_SESION = Object.freeze({
  duracionAbsolutaSegundos: 8 * 60 * 60
});

export function limiteAbsolutoSesion(creadoEn) {
  const fecha = new Date(creadoEn).getTime();
  if (!Number.isFinite(fecha)) throw new Error('Fecha de sesión inválida.');
  return new Date(Math.floor(fecha / 1000) * 1000 + POLITICA_SESION.duracionAbsolutaSegundos * 1000);
}

export function calcularRenovacionSesion({ creadoEn, expiraTokenEn, ahora = new Date(), duracionSegundos }) {
  const segundoActual = Math.floor(ahora.getTime() / 1000);
  const vencimiento = Math.floor(new Date(expiraTokenEn).getTime() / 1000);
  const limite = Math.floor(limiteAbsolutoSesion(creadoEn).getTime() / 1000);
  // Una sesión vencida nunca se recupera mediante renovación.
  if (vencimiento <= segundoActual || limite <= segundoActual) return null;
  const destino = Math.min(segundoActual + duracionSegundos, limite);
  // Adaptar únicamente sesiones antiguas cortas todavía vigentes. No renovar
  // las sesiones que ya tienen el plazo completo ni desplazar el límite de turno.
  if (destino <= vencimiento) return null;
  return new Date(destino * 1000);
}
