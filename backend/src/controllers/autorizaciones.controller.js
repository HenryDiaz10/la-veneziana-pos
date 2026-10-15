import {
  crearAutorizacion
} from '../services/autorizaciones.service.js';

// Emitir una autorización para una acción y un recurso concretos.
export async function registrarAutorizacion(req, res, next) {
  res.set('Cache-Control', 'no-store');

  try {
    const resultado = await crearAutorizacion({
      // El aprobador siempre procede de la sesión autenticada.
      aprobadorId: req.auth.usuario.id,
      datos: req.body
    });

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Revisa el actor, la acción, la entidad, el identificador y el motivo.'
      });
    }

    if (resultado.estado === 'accion_no_habilitada') {
      return res.status(400).json({
        mensaje: 'La combinación de acción y entidad no está habilitada.'
      });
    }

    if (resultado.estado === 'aprobador_invalido') {
      res.set('WWW-Authenticate', 'Bearer');

      return res.status(401).json({
        mensaje: 'Autenticación requerida.'
      });
    }

    if (resultado.estado === 'actor_invalido') {
      return res.status(400).json({
        mensaje: 'El empleado indicado no está disponible para operar.'
      });
    }

    if (resultado.estado === 'sin_permiso') {
      return res.status(403).json({
        mensaje: 'No tienes permiso para aprobar esta acción.'
      });
    }

    if (resultado.estado === 'actor_sin_permiso') {
      return res.status(403).json({
        mensaje: 'El empleado indicado no tiene permiso para ejecutar esta acción.'
      });
    }

    if (resultado.estado === 'recurso_inexistente') {
      return res.status(404).json({
        mensaje: 'El recurso indicado no existe.'
      });
    }

    if (resultado.estado !== 'creada') {
      throw new Error('Resultado inesperado al crear una autorización.');
    }

    return res.status(201).json({
      mensaje: 'Autorización creada.',
      autorizacion: resultado.autorizacion
    });
  } catch (error) {
    return next(error);
  }
}