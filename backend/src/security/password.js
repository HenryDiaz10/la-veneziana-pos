import bcrypt from 'bcrypt';

// Costo de cálculo utilizado al crear nuevos hashes.
const COSTO_BCRYPT = 12;

// bcrypt utiliza como máximo 72 bytes de la contraseña.
// Medimos bytes UTF-8, porque no equivalen siempre a caracteres.
function tieneLongitudCompatible(password) {
  return (
    typeof password === 'string' &&
    password.length > 0 &&
    Buffer.byteLength(password, 'utf8') <= 72
  );
}

// Generar un hash para una contraseña nueva.
// bcrypt genera e incorpora la sal automáticamente.
export async function crearHashPassword(password) {
  if (
    !tieneLongitudCompatible(password) ||
    [...password].length < 12
  ) {
    throw new Error(
      'La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes UTF-8.'
    );
  }

  return bcrypt.hash(password, COSTO_BCRYPT);
}

// Verificar la contraseña recibida contra el hash almacenado.
// No recortar espacios ni modificar la contraseña.
export async function verificarPassword(password, hash) {
  if (
    !tieneLongitudCompatible(password) ||
    typeof hash !== 'string' ||
    hash.length === 0
  ) {
    return false;
  }

  return bcrypt.compare(password, hash);
}