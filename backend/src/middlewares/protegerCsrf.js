import { env } from '../config/env.js';

// Estas solicitudes deben limitarse a consultar información.
const METODOS_SEGUROS = new Set([
  'GET',
  'HEAD',
  'OPTIONS'
]);

export function protegerCsrf(req, res, next) {
  res.set('Cache-Control', 'no-store');

  if (METODOS_SEGUROS.has(req.method)) {
    return next();
  }

  // Exigir una coincidencia exacta con el frontend autorizado.
  // Un origen ausente o "null" también será rechazado.
  const origenValido =
    req.get('Origin') === env.origenFrontend;

  // Este encabezado no se envía mediante formularios HTML externos.
  // Las solicitudes entre orígenes necesitan autorización CORS.
  const encabezadoValido =
    req.get('X-CSRF-Protection') === '1';

  if (!origenValido || !encabezadoValido) {
    return res.status(403).json({
      mensaje: 'Solicitud no permitida.'
    });
  }

  return next();
}