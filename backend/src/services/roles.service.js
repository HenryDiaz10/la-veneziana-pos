import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';

import {
  Rol,
  Permiso,
  RolPermiso,
  Usuario,
  AuthSesion
} from '../models/index.js';

import { validarAsignacionPermisos } from '../validators/roles.js';

// Consultar los roles y los permisos asignados a cada uno.
export async function obtenerRolesConPermisos() {
  const roles = await Rol.findAll({
    attributes: ['id', 'nombre', 'descripcion', 'is_system'],

    include: [{
      model: Permiso,
      as: 'permisos',
      attributes: ['id', 'modulo', 'accion', 'descripcion'],

      // Excluir los campos de la tabla intermedia.
      through: {
        attributes: []
      }
    }],

    order: [['id', 'ASC']]
  });

  return {
    roles: roles.map(rol => ({
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      esSistema: rol.is_system,

      permisos: rol.permisos.map(permiso => ({
        id: permiso.id,
        modulo: permiso.modulo,
        accion: permiso.accion,
        descripcion: permiso.descripcion
      })).sort((a, b) => a.id - b.id)
    }))
  };
}

// Consultar el catálogo de permisos disponibles.
export async function obtenerPermisos() {
  const permisos = await Permiso.findAll({
    attributes: ['id', 'modulo', 'accion', 'descripcion'],
    order: [
      ['modulo', 'ASC'],
      ['accion', 'ASC']
    ]
  });

  return {
    permisos: permisos.map(permiso => ({
      id: permiso.id,
      modulo: permiso.modulo,
      accion: permiso.accion,
      descripcion: permiso.descripcion
    }))
  };
}

// Reemplazar la lista completa de permisos de un rol.
export async function asignarPermisosRol({
  rolId,
  actorId,
  datos
}) {
  const entrada = validarAsignacionPermisos(datos);

  if (
    entrada === null ||
    !Number.isSafeInteger(rolId) ||
    rolId <= 0 ||
    rolId > 2147483647 ||
    !Number.isSafeInteger(actorId) ||
    actorId <= 0
  ) {
    return { estado: 'datos_invalidos' };
  }

  return sequelize.transaction(async transaction => {
    // Mantener el mismo bloqueo usado en la gestión de empleados.
    const administrador = await Rol.findOne({
      where: { nombre: 'administrador' },
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (administrador === null) {
      throw new Error('No existe el rol administrador.');
    }

    // Conservar los permisos del rol administrador.
    if (rolId === administrador.id) {
      return { estado: 'rol_protegido' };
    }

    const actor = await Usuario.findByPk(actorId, {
      attributes: ['id', 'rol_id', 'estado'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (actor === null || actor.estado !== 'activo') {
      return { estado: 'actor_invalido' };
    }

    // Evitar que el operador modifique los permisos de su propio rol.
    if (actor.rol_id === rolId) {
      return { estado: 'rol_propio' };
    }

    const rol = await Rol.findByPk(rolId, {
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (rol === null) {
      return { estado: 'rol_inexistente' };
    }

    const ids = entrada.permisoIds;

    // Comprobar todos los permisos antes de modificar asignaciones.
    if (ids.length > 0) {
      const permisos = await Permiso.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['id'],
        transaction,
        lock: transaction.LOCK.SHARE
      });

      if (permisos.length !== ids.length) {
        return { estado: 'permiso_inexistente' };
      }
    }

    const asignaciones = await RolPermiso.findAll({
      where: { rol_id: rol.id },
      attributes: ['permiso_id'],
      transaction
    });

    const actuales = asignaciones
      .map(asignacion => asignacion.permiso_id)
      .sort((a, b) => a - b);

    const hayCambios =
      actuales.length !== ids.length ||
      actuales.some((id, indice) => id !== ids[indice]);

    if (hayCambios) {
      // Bloquear a los empleados afectados para coordinar con el login.
      const empleados = await Usuario.findAll({
        where: { rol_id: rol.id },
        attributes: ['id'],
        order: [['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      await RolPermiso.destroy({
        where: { rol_id: rol.id },
        transaction
      });

      if (ids.length > 0) {
        await RolPermiso.bulkCreate(
          ids.map(permisoId => ({
            rol_id: rol.id,
            permiso_id: permisoId
          })),
          { transaction }
        );
      }

      if (empleados.length > 0) {
        await AuthSesion.update({
          revocada_en: new Date()
        }, {
          where: {
            usuario_id: {
              [Op.in]: empleados.map(empleado => empleado.id)
            },
            revocada_en: null
          },
          transaction,
          fields: ['revocada_en']
        });
      }
    }

    return {
      estado: 'actualizado',
      rol: {
        id: rol.id,
        permisoIds: ids
      }
    };
  });
}