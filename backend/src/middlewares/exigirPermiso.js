// Preparar un middleware para un permiso concreto.
export function exigirPermiso(modulo, accion) {
  // Detectar errores de configuración al registrar las rutas.
  if (
    typeof modulo !== 'string' ||
    typeof accion !== 'string' ||
    modulo.length === 0 ||
    accion.length === 0 ||
    modulo.length > 50 ||
    accion.length > 50 ||
    modulo !== modulo.trim() ||
    accion !== accion.trim()
  ) {
    throw new TypeError('Debes indicar un módulo y una acción válidos.');
  }

  return function comprobarPermiso(req, res, next) {
    res.set('Cache-Control', 'no-store');

    // La autenticación debe ejecutarse primero.
    if (!req.auth?.usuario) {
      res.set('WWW-Authenticate', 'Bearer');

      return res.status(401).json({
        mensaje: 'Autenticación requerida.'
      });
    }

    const permisos = req.auth.usuario.permisos;

    const permitido = (
      Array.isArray(permisos) &&
      permisos.some(permiso =>
        permiso.modulo === modulo &&
        permiso.accion === accion
      )
    );

    if (!permitido) {
      return res.status(403).json({
        mensaje: 'No tienes permiso para realizar esta acción.'
      });
    }

    return next();
  };
}