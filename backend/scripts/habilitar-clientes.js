import { sequelize } from '../src/config/database.js';
import { Rol, Permiso, RolPermiso } from '../src/models/index.js';

// Actualizar instalaciones existentes sin volver a sembrar otros permisos.
// Repetir el comando no duplica registros ni modifica otros roles.
try {
  await sequelize.transaction(async transaction => {
    const administrador = await Rol.findOne({
      where: { nombre: 'administrador' }, attributes: ['id'],
      transaction, lock: transaction.LOCK.UPDATE
    });
    if (!administrador) throw new Error('Rol administrador no disponible.');
    const [permiso] = await Permiso.findOrCreate({
      where: { modulo: 'clientes', accion: 'gestionar' },
      defaults: { descripcion: 'Alta y actualización de clientes y direcciones' },
      transaction
    });
    await RolPermiso.findOrCreate({
      where: { rol_id: administrador.id, permiso_id: permiso.id }, transaction
    });
  });
  console.log('Permiso clientes/gestionar habilitado para administrador. Otros roles sin cambios.');
} catch (error) {
  // Evitar mostrar SQL, configuración o datos personales.
  console.error('No se pudo habilitar clientes:', error.name);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
