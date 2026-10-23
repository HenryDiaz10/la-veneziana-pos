import {
  iniciarSesion,
  cerrarSesion
} from '../services/auth.service.js';

import {
  establecerCookieSesion,
  borrarCookieSesion
} from '../security/cookies.js';

export async function login(req, res, next) {
  res.set('Cache-Control', 'no-store');

  try {
    const resultado = await iniciarSesion(req.body);

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Debes enviar un correo válido y una contraseña válida.'
      });
    }

    if (resultado.estado === 'credenciales_invalidas') {
      return res.status(401).json({
        mensaje: 'Correo o contraseña incorrectos.'
      });
    }

    if (resultado.estado !== 'autenticado') {
      throw new Error('Resultado de autenticación inesperado.');
    }

    // El navegador guarda la cookie.
    // JavaScript no recibe el JWT en la respuesta.
    establecerCookieSesion(res, resultado.token);

    return res.status(200).json({
      mensaje: 'Inicio de sesión correcto.',
      expiraEn: resultado.expiraEn,
      usuario: resultado.usuario
    });
  } catch (error) {
    return next(error);
  }
}

// Consultar la identidad y los permisos actuales.
export function sesionActual(req, res) {
  res.set('Cache-Control', 'no-store');

  return res.status(200).json({
    usuario: req.auth.usuario,
    expiraEn: req.auth.sesion.expiraEn
  });
}

// Revocar la sesión presentada y retirar la cookie del navegador.
export async function logout(req, res, next) {
  res.set('Cache-Control', 'no-store');

  try {
    await cerrarSesion({
      usuarioId: req.auth.usuario.id,
      sesionUid: req.auth.sesion.uid
    });

    // Borrar la cookie después de guardar la revocación.
    borrarCookieSesion(res);

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}
