// Devolver las credenciales validadas o null si el formato es inválido.
export function validarCredencialesLogin(datos) {
  // El cuerpo debe ser un objeto, no null ni un arreglo.
  if (
    datos === null ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    return null;
  }

  const { email, password } = datos;

  if (
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return null;
  }

  // Recortar únicamente los espacios exteriores del correo.
  const correo = email.trim();

  // Comprobación básica de formato y longitud de la columna SQL.
  if (
    correo.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
  ) {
    return null;
  }

  // Conservar la contraseña exactamente como fue recibida.
  if (
    password.length === 0 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return null;
  }

  return {
    email: correo,
    password
  };
}