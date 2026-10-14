// Leer la dirección pública configurada mediante Vite.
// Si la variable no existe, usamos texto vacío para poder validarla.
const valor = (import.meta.env.VITE_API_URL ?? '').trim();

// Detener la carga de esta configuración si falta la dirección.
if (!valor) {
  throw new Error('Falta configurar VITE_API_URL en el frontend.');
}

// Admitir /api para una futura publicación conjunta.
// En ese caso, el navegador utilizará el mismo origen de la página.
if (valor !== '/api') {
  // Guardar la dirección interpretada para revisar sus partes.
  let direccion;

  try {
    // Exigir una dirección absoluta, como http://127.0.0.1:3000.
    direccion = new URL(valor);
  } catch {
    throw new Error('VITE_API_URL debe ser una URL HTTP/HTTPS o /api.');
  }

  // Permitir únicamente los protocolos utilizados por nuestra API.
  if (!['http:', 'https:'].includes(direccion.protocol)) {
    throw new Error('VITE_API_URL debe utilizar HTTP o HTTPS.');
  }

  // Evitar credenciales, consultas y fragmentos en la dirección base.
  if (
    direccion.username ||
    direccion.password ||
    direccion.search ||
    direccion.hash
  ) {
    throw new Error(
      'VITE_API_URL no debe contener credenciales, consultas ni fragmentos.'
    );
  }
}

// Exportar la dirección sin barras finales para unir futuras rutas.
export const API_URL = valor.replace(/\/+$/, '');