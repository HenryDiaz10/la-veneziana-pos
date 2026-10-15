import { fileURLToPath } from 'node:url';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelizeMigrations } from './database.migrations.js';

// Localizar backend/migrations desde este archivo.
const carpetaMigraciones = fileURLToPath(
  new URL('../../migrations/', import.meta.url)
);

// Preparar el administrador de migraciones.
// Crear este objeto no ejecuta consultas ni modifica tablas.
export const migrador = new Umzug({
  migrations: {
    // Buscar archivos JavaScript directamente en migrations.
    // Usaremos nombres numerados para establecer su orden.
    glob: [
      '*.js',
      {
        cwd: carpetaMigraciones
      }
    ]
  },

  // Entregar la interfaz de Sequelize a cada migración.
  // Permite crear tablas, índices y restricciones.
  context: sequelizeMigrations.getQueryInterface(),

  // Registrar los nombres de las migraciones aplicadas.
  storage: new SequelizeStorage({
    sequelize: sequelizeMigrations,
    tableName: 'SequelizeMeta'
  }),

  // El ejecutor que crearemos mostrará los resultados.
  logger: undefined
});