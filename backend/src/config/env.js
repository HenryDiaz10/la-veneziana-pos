// Cargar las variables del archivo .env del backend.
import 'dotenv/config';

// Leer y validar el entorno de ejecución.
const entorno = process.env.NODE_ENV ?? 'development';

if (!['development', 'test', 'production'].includes(entorno)) {
  throw new Error('NODE_ENV debe ser development, test o production.');
}

// Convertir el puerto de texto a número y comprobar su rango.
const puerto = Number(process.env.PORT ?? '3000');

if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  throw new Error('PORT debe ser un número entero entre 1 y 65535.');
}

// Leer la dirección de escucha y rechazar un valor vacío.
const host = (process.env.HOST ?? '127.0.0.1').trim();

if (!host) {
  throw new Error('HOST no debe estar vacío.');
}

// Leer el origen permitido para el frontend.
const valorOrigen = (process.env.CORS_ORIGIN ?? '').trim();
let direccionOrigen;

try {
  // Interpretar el origen como una URL absoluta.
  direccionOrigen = new URL(valorOrigen);
} catch {
  throw new Error('CORS_ORIGIN debe contener un origen HTTP o HTTPS.');
}

// Un origen contiene protocolo, host y puerto.
// No debe incluir credenciales, rutas, consultas ni fragmentos.
if (
  !['http:', 'https:'].includes(direccionOrigen.protocol) ||
  direccionOrigen.username ||
  direccionOrigen.password ||
  direccionOrigen.pathname !== '/' ||
  direccionOrigen.search ||
  direccionOrigen.hash
) {
  throw new Error('CORS_ORIGIN debe ser un origen HTTP/HTTPS sin otros datos.');
}

// Leer el secreto privado sin imprimirlo.
const secretoJwt = process.env.JWT_SECRET ?? '';

// Exigir el formato que utilizamos al generarlo:
// pares hexadecimales que representen al menos 32 bytes.
if (!/^(?:[0-9a-fA-F]{2}){32,}$/.test(secretoJwt)) {
  throw new Error(
    'JWT_SECRET debe contener al menos 32 bytes en formato hexadecimal.'
  );
}

// Leer la dirección del futuro servidor MySQL.
const databaseHost = (process.env.DATABASE_HOST ?? '').trim();

if (!databaseHost) {
  throw new Error('DATABASE_HOST no debe estar vacío.');
}

// Convertir y validar el puerto de MySQL.
const databasePort = Number(process.env.DATABASE_PORT ?? '3306');

if (
  !Number.isInteger(databasePort) ||
  databasePort < 1 ||
  databasePort > 65535
) {
  throw new Error('DATABASE_PORT debe ser un entero entre 1 y 65535.');
}

// Aplicar una regla sencilla al nombre elegido para nuestra base.
// Admitimos letras, números y guion bajo, con un máximo de 64 caracteres.
const databaseName = (process.env.DATABASE_NAME ?? '').trim();

if (!/^[A-Za-z0-9_]{1,64}$/.test(databaseName)) {
  throw new Error(
    'DATABASE_NAME debe tener de 1 a 64 letras, números o guiones bajos.'
  );
}

// Leer los valores que completaremos al preparar MySQL.
// No recortar la contraseña: los espacios podrían formar parte de ella.
const databaseUser = (process.env.DATABASE_USER ?? '').trim();
const databasePassword = process.env.DATABASE_PASSWORD ?? '';
const databaseCa = (process.env.DATABASE_CA ?? '').trim();

// Exportar la configuración validada.
// No registrar este objeto completo: contiene valores privados.
export const env = Object.freeze({
  entorno,
  puerto,
  host,
  origenFrontend: direccionOrigen.origin,
  secretoJwt,

  // Agrupar la configuración de la futura conexión MySQL.
  database: Object.freeze({
    host: databaseHost,
    port: databasePort,
    name: databaseName,
    user: databaseUser,
    password: databasePassword,
    ca: databaseCa
  })
});