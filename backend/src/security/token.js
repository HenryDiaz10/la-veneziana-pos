import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Opciones compartidas por la firma y la futura verificación.
export const CONFIG_TOKEN = Object.freeze({
  algoritmo: 'HS256',
  emisor: 'la-veneziana-backend',
  audiencia: 'la-veneziana-pos',
  duracionSegundos: 15 * 60
});

// Interpretar el secreto hexadecimal que ya valida env.js.
// La clave permanece privada dentro de este módulo.
const claveFirma = Buffer.from(env.secretoJwt, 'hex');

// Emitir un token de acceso para un usuario identificado.
export function crearTokenAcceso(usuarioId) {
  if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
    throw new Error('El identificador del usuario debe ser un entero positivo.');
  }

  return jwt.sign(
    {},
    claveFirma,
    {
      algorithm: CONFIG_TOKEN.algoritmo,
      issuer: CONFIG_TOKEN.emisor,
      audience: CONFIG_TOKEN.audiencia,
      expiresIn: CONFIG_TOKEN.duracionSegundos,

      // sub identifica al usuario y debe ser una cadena.
      subject: String(usuarioId),

      // jti distingue cada token emitido.
      jwtid: randomUUID()
    }
  );
}