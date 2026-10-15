import { rateLimit } from 'express-rate-limit';

export const limitarLogin = rateLimit({
  // Ventana de 15 minutos.
  windowMs: 15 * 60 * 1000,

  // Máximo de solicitudes por IP dentro de esa ventana.
  limit: 20,

  // Informar el límite mediante encabezados HTTP.
  standardHeaders: 'draft-8',
  legacyHeaders: false,

  // Contar también las respuestas correctas.
  skipSuccessfulRequests: false,

  // Responder en JSON cuando se supera el límite.
  handler(req, res) {
    res.set('Cache-Control', 'no-store');

    return res.status(429).json({
      mensaje: 'Demasiadas solicitudes. Intenta nuevamente más tarde.'
    });
  }
});