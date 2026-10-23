import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { POLITICA_SESION } from './sesion.js';

// Opciones compartidas por la firma y la futura verificación.
export const CONFIG_TOKEN = Object.freeze({
  algoritmo: 'HS256',
  emisor: 'la-veneziana-backend',
  audiencia: 'la-veneziana-pos',
  duracionSegundos: POLITICA_SESION.duracionAbsolutaSegundos
});

// Interpretar el secreto hexadecimal que ya valida env.js.
// La clave permanece privada dentro de este módulo.
const claveFirma = Buffer.from(env.secretoJwt, 'hex');

// Emitir un token de acceso para un usuario identificado.
export function crearTokenAcceso(usuarioId, { sesionUid = randomUUID(), expiraEn = null } = {}) {
  if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
    throw new Error('El identificador del usuario debe ser un entero positivo.');
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sesionUid)) {
    throw new Error('Identificador de sesión inválido.');
  }
  const ahoraSegundos = Math.floor(Date.now() / 1000);
  const duracion = expiraEn === null ? CONFIG_TOKEN.duracionSegundos
    : Math.floor(expiraEn.getTime() / 1000) - ahoraSegundos;
  if (!Number.isInteger(duracion) || duracion <= 0 || duracion > CONFIG_TOKEN.duracionSegundos) {
    throw new Error('Duración de acceso inválida.');
  }

  return jwt.sign(
    { iat: ahoraSegundos },
    claveFirma,
    {
      algorithm: CONFIG_TOKEN.algoritmo,
      issuer: CONFIG_TOKEN.emisor,
      audience: CONFIG_TOKEN.audiencia,
      expiresIn: duracion,

      // sub identifica al usuario y debe ser una cadena.
      subject: String(usuarioId),

      // jti distingue cada token emitido.
      // Mantener la identidad de sesión permite renovar sin crear sesiones
      // paralelas; logout y revocación invalidan también los tokens renovados.
      jwtid: sesionUid
    }
  );
}

// Verificar la firma, el vencimiento y los datos obligatorios del token.
export function verificarTokenAcceso(token) {
  if (
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > 4096
  ) {
    throw new jwt.JsonWebTokenError('Token de acceso inválido.');
  }

  // Aceptar exclusivamente nuestro algoritmo, emisor y audiencia.
  // jwt.verify también comprueba exp y nbf cuando están presentes.
  const contenido = jwt.verify(token, claveFirma, {
    algorithms: [CONFIG_TOKEN.algoritmo],
    issuer: CONFIG_TOKEN.emisor,
    audience: CONFIG_TOKEN.audiencia
  });

  const ahora = Math.floor(Date.now() / 1000);

  // Exigir los claims que genera nuestra aplicación.
  if (
    typeof contenido !== 'object' ||
    contenido === null ||
    typeof contenido.sub !== 'string' ||
    !/^[1-9]\d*$/.test(contenido.sub) ||
    !Number.isSafeInteger(Number(contenido.sub)) ||
    typeof contenido.jti !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(contenido.jti) ||
    !Number.isInteger(contenido.iat) ||
    !Number.isInteger(contenido.exp) ||
    contenido.iat > ahora ||
    contenido.exp <= contenido.iat ||
    contenido.exp - contenido.iat > CONFIG_TOKEN.duracionSegundos
  ) {
    throw new jwt.JsonWebTokenError('Token de acceso inválido.');
  }

  // Devolver únicamente los datos necesarios para consultar la sesión.
  return {
    usuarioId: Number(contenido.sub),
    sesionUid: contenido.jti,
    expiraEn: new Date(contenido.exp * 1000)
  };
}
