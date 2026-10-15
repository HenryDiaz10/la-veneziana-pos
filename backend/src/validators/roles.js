// Validar la lista completa de permisos que tendrá un rol.
export function validarAsignacionPermisos(datos) {
  if (
    datos === null ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    return null;
  }

  const campos = Object.keys(datos);

  if (
    campos.length !== 1 ||
    campos[0] !== 'permisoIds'
  ) {
    return null;
  }

  const { permisoIds } = datos;

  // Permitir una lista vacía para retirar todos los permisos.
  // Las protecciones del rol se comprobarán en el servicio.
  if (
    !Array.isArray(permisoIds) ||
    permisoIds.length > 100
  ) {
    return null;
  }

  if (
    permisoIds.some(id =>
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      id > 2147483647
    )
  ) {
    return null;
  }

  // Rechazar identificadores repetidos.
  if (new Set(permisoIds).size !== permisoIds.length) {
    return null;
  }

  // Devolver una copia ordenada.
  return {
    permisoIds: [...permisoIds].sort((a, b) => a - b)
  };
}