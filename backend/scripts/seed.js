import { sequelizeMigrations } from '../src/config/database.migrations.js';
import { sembrarRoles } from '../seeders/0001-roles.js';
import { sembrarPermisos } from '../seeders/0002-permisos.js';
import { sembrarRolPermisos } from '../seeders/0003-rol-permisos.js';
import { sembrarConfiguracionGlobal } from '../seeders/0004-configuracion-global.js';

try {
  await sequelizeMigrations.authenticate();

  await sequelizeMigrations.transaction(async transaction => {
    const contexto = {
      sequelize: sequelizeMigrations,
      transaction
    };

    await sembrarRoles(contexto);
    await sembrarPermisos(contexto);
    await sembrarRolPermisos(contexto);
    await sembrarConfiguracionGlobal(contexto);
  });

  console.log('Seeds iniciales completados.');
} catch (error) {
  console.error('La carga de datos iniciales fallo.');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await sequelizeMigrations.close().catch(() => {
    console.error('No se pudo cerrar el pool.');
    process.exitCode = 1;
  });
}