import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { Sequelize } from 'sequelize';

// Localizar el backend desde este archivo.
// Así no dependemos de la carpeta desde donde se ejecute el comando.
const carpetaBackend = fileURLToPath(new URL('../../', import.meta.url));

// Leer únicamente la configuración privada de migraciones.
// parse() devuelve un objeto sin modificar process.env.
let configuracion;

try {
  configuracion = parse(
    readFileSync(resolve(carpetaBackend, '.env.migrations'), 'utf8')
  );
} catch {
  throw new Error('No se pudo leer backend/.env.migrations.');
}

// Validar el entorno.
const entorno = configuracion.NODE_ENV;

if (!['development', 'test', 'production'].includes(entorno)) {
  throw new Error(
    'NODE_ENV en .env.migrations debe ser development, test o production.'
  );
}

// Leer la configuración de conexión.
// La contraseña se conserva exactamente como fue escrita.
const host = (configuracion.DATABASE_HOST ?? '').trim();
const puertoTexto = (configuracion.DATABASE_PORT ?? '').trim();
const puerto = Number(puertoTexto);
const nombre = (configuracion.DATABASE_NAME ?? '').trim();
const usuario = (configuracion.DATABASE_USER ?? '').trim();
const clave = configuracion.DATABASE_PASSWORD ?? '';
const rutaCa = (configuracion.DATABASE_CA ?? '').trim();

if (!host) {
  throw new Error('Completa DATABASE_HOST en .env.migrations.');
}

if (
  !/^\d+$/.test(puertoTexto) ||
  !Number.isInteger(puerto) ||
  puerto < 1 ||
  puerto > 65535
) {
  throw new Error('DATABASE_PORT debe ser un entero entre 1 y 65535.');
}

if (!/^[A-Za-z0-9_]{1,64}$/.test(nombre)) {
  throw new Error('DATABASE_NAME debe contener letras, números o guion bajo.');
}

if (!usuario || !clave) {
  throw new Error(
    'Completa DATABASE_USER y DATABASE_PASSWORD en .env.migrations.'
  );
}

if (!rutaCa) {
  throw new Error('Completa DATABASE_CA en .env.migrations.');
}

// Leer la CA. Las rutas relativas parten de la carpeta backend.
let certificadoCa;

try {
  certificadoCa = readFileSync(resolve(carpetaBackend, rutaCa), 'utf8');

  if (!certificadoCa.trim()) {
    throw new Error('Certificado vacío.');
  }
} catch {
  throw new Error('No se pudo leer una CA válida para las migraciones.');
}

const esConexionLocal = ['127.0.0.1', 'localhost', '::1'].includes(host);

// Crear la conexión independiente.
// Sequelize abrirá las conexiones cuando se realice una consulta.
export const sequelizeMigrations = new Sequelize(
  nombre,
  usuario,
  clave,
  {
    dialect: 'mysql',
    host,
    port: puerto,
    timezone: '+00:00',
    logging: false,

    dialectOptions: {
      connectTimeout: 5000,

      ssl: {
        ca: certificadoCa,
        rejectUnauthorized: true,
        verifyIdentity: entorno === 'production' || !esConexionLocal
      }
    },

    // El ejecutor aplicará las migraciones secuencialmente.
    pool: {
      max: 1,
      min: 0,
      acquire: 5000,
      idle: 10000,
      evict: 1000
    }
  }
);