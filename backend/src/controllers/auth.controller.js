import {
  iniciarSesion,
  cerrarSesion
} from '../services/auth.service.js';

export async function login(req, res, next) {
  // Evitar que se almacenen respuestas con datos de autenticación.
  res.set('Cache-Control', 'no-store');

  try {
    const resultado = await iniciarSesion(req.body);

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Debes enviar un correo válido y una contraseña válida.'
      });
    }

    if (resultado.estado === 'credenciales_invalidas') {
      // Mantener el mismo mensaje para todos los rechazos de acceso.
      return res.status(401).json({
        mensaje: 'Correo o contraseña incorrectos.'
      });
    }

    if (resultado.estado === 'autenticado') {
      return res.status(200).json({
        mensaje: 'Inicio de sesión correcto.',
        token: resultado.token,
        expiraEn: resultado.expiraEn,
        usuario: resultado.usuario
      });
    }

    // Un resultado inesperado debe tratarse como error interno.
    throw new Error('Resultado de autenticación inesperado.');
  } catch (error) {
    // El manejador central enviará la respuesta general HTTP 500.
    next(error);
  }
}

// Consultar la identidad validada por el middleware.
export function sesionActual(req, res) {
  return res.status(200).json({
    usuario: req.auth.usuario
  });
}

// Cerrar la sesión del token presentado.
// Los identificadores proceden del middleware, no del cuerpo recibido.
export async function logout(req, res, next) {
  res.set('Cache-Control', 'no-store');

  try {
    await cerrarSesion({
      usuarioId: req.auth.usuario.id,
      sesionUid: req.auth.sesion.uid
    });

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}