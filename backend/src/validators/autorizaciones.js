// Validar los datos de una solicitud de autorización sensible.
export function validarAltaAutorizacion(datos) {
  if (
    datos === null ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    return null;
  }

  const camposPermitidos = new Set([
    'actorId',
    'accion',
    'entidad',
    'entidadId',
    'motivo'
  ]);

  if (
    Object.keys(datos).some(campo => !camposPermitidos.has(campo))
  ) {
    return null;
  }

  if (
    !Number.isSafeInteger(datos.actorId) ||
    datos.actorId <= 0 ||
    datos.actorId > 2147483647 ||
    !Number.isSafeInteger(datos.entidadId) ||
    datos.entidadId <= 0
  ) {
    return null;
  }

  // Usar identificadores técnicos sin espacios ni caracteres libres.
  // El servicio comprobará qué acciones y entidades están habilitadas.
  const identificador = /^[a-z][a-z0-9_/.:-]{0,79}$/;

  if (
    typeof datos.accion !== 'string' ||
    typeof datos.entidad !== 'string' ||
    !identificador.test(datos.accion) ||
    !identificador.test(datos.entidad)
  ) {
    return null;
  }

  if (typeof datos.motivo !== 'string') {
    return null;
  }

  const motivo = datos.motivo.trim();

  if (
    motivo.length === 0 ||
    [...motivo].length > 500 ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(motivo)
  ) {
    return null;
  }

  // El aprobador, el vencimiento y la fecha de consumo
  // serán establecidos por el servidor.
  return {
    actorId: datos.actorId,
    accion: datos.accion,
    entidad: datos.entidad,
    entidadId: datos.entidadId,
    motivo
  };
}