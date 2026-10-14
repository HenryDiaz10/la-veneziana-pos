// Leer el certificado público de la autoridad certificadora.
import { readFileSync } from 'node:fs';

// Importar Sequelize y nuestra configuración validada.
import { Sequelize } from 'sequelize';
import { env } from './env.js';

// Exigir las credenciales antes de preparar la conexión.
if (!env.database.user || !env.database.password) {
  throw new Error('Configura DATABASE_USER y DATABASE_PASSWORD.');
}

// Exigir un certificado CA para verificar el servidor.
if (!env.database.ca) {
  throw new Error('Configura DATABASE_CA con la ruta del certificado público.');
}

// Leer el certificado sin registrar su contenido.
let certificadoCa;

try {
  certificadoCa = readFileSync(env.database.ca, 'utf8');
} catch {
  throw new Error('No se pudo leer el certificado indicado en DATABASE_CA.');
}

// Identificar las conexiones locales de desarrollo.
const esConexionLocal = [
  '127.0.0.1',
  'localhost',
  '::1'
].includes(env.database.host);

// Crear una instancia que compartirán los módulos del backend.
// Las conexiones se abrirán cuando realicemos consultas.
export const sequelize = new Sequelize(
  env.database.name,
  env.database.user,
  env.database.password,
  {
    // Seleccionar el motor y su dirección.
    dialect: 'mysql',
    host: env.database.host,
    port: env.database.port,

    // Configurar las sesiones de MySQL para trabajar en UTC.
    timezone: '+00:00',

    // Evitar imprimir consultas SQL y sus posibles datos sensibles.
    logging: false,

    // Opciones entregadas al controlador mysql2.
    dialectOptions: {
      // Limitar a cinco segundos el establecimiento de la conexión.
      connectTimeout: 5000,

      ssl: {
        // Confiar en la CA específica de nuestro servidor.
        ca: certificadoCa,

        // Rechazar certificados que no superen la verificación.
        rejectUnauthorized: true,

        // Verificar además el nombre del servidor en producción
        // y en conexiones que no sean locales.
        verifyIdentity: env.entorno === 'production' || !esConexionLocal
      }
    },

    // Limitar y reutilizar las conexiones del proceso.
    pool: {
      max: 5,
      min: 0,
      acquire: 5000,
      idle: 10000,
      evict: 1000
    }
  }
);