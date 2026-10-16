import { env } from '../config/env.js';
import { verificarTokenAcceso } from './token.js';

const esProduccion = env.entorno === 'production';

// En producción, el prefijo __Host- exige Secure,
// ruta raíz y ausencia de Domain.
export const NOMBRE_COOKIE_SESION = esProduccion
  ? '__Host-veneziana_sesion'
  : 'veneziana_sesion';

const OPCIONES_COOKIE_SESION = Object.freeze({
  httpOnly: true,
  secure: esProduccion,
  sameSite: 'lax',
  path: '/'
});

// Guardar el JWT en una cookie que JavaScript no puede leer.
export function establecerCookieSesion(res, token) {
  // Usar el vencimiento real del token.
  // La cookie no renueva ni extiende la sesión.
  const datosToken = verificarTokenAcceso(token);

  res.cookie(NOMBRE_COOKIE_SESION, token, {
    ...OPCIONES_COOKIE_SESION,
    expires: datosToken.expiraEn
  });
}

// Borrar la cookie utilizando el mismo nombre y alcance.
// La revocación en MySQL se realiza mediante el servicio de sesión.
export function borrarCookieSesion(res) {
  res.clearCookie(
    NOMBRE_COOKIE_SESION,
    OPCIONES_COOKIE_SESION
  );
}