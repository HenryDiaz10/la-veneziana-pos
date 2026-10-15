import { Usuario, Rol, AuthSesion } from '../models/index.js';
import { UniqueConstraintError } from 'sequelize';
import { sequelize } from '../config/database.js';
import { crearHashPassword } from '../security/password.js';
import {
  validarAltaUsuario,
  validarCambioEstadoUsuario,
  validarCambioRolUsuario,
  validarRestablecimientoPassword
} from '../validators/usuarios.js';

export async function obtenerUsuariosPaginados({ pagina, limite }) {
  const { count, rows } = await Usuario.findAndCountAll({
    // Seleccionar únicamente los campos que necesitamos.
    attributes: [
      'id',
      'nombre_completo',
      'email',
      'estado',
      'created_at'
    ],

    include: [{
      model: Rol,
      as: 'rol',
      attributes: ['id', 'nombre']
    }],

    order: [['id', 'ASC']],
    limit: limite,
    offset: (pagina - 1) * limite
  });

  return {
    usuarios: rows.map(usuario => ({
      id: usuario.id,
      nombre: usuario.nombre_completo,
      email: usuario.email,
      estado: usuario.estado,
      creadoEn: usuario.created_at,

      rol: {
        id: usuario.rol.id,
        nombre: usuario.rol.nombre
      }
    })),

    paginacion: {
      pagina,
      limite,
      total: count,
      paginas: Math.ceil(count / limite)
    }
  };
}

// Crear un empleado con un rol existente y contraseña protegida.
export async function crearUsuario(datos) {
  const entrada = validarAltaUsuario(datos);

  if (entrada === null) {
    return { estado: 'datos_invalidos' };
  }

  // Realizar el cálculo de bcrypt antes de abrir la transacción.
  const passwordHash = await crearHashPassword(entrada.password);

  try {
    return await sequelize.transaction(async transaction => {
      const rol = await Rol.findByPk(entrada.rolId, {
        attributes: ['id', 'nombre'],
        transaction,
        lock: transaction.LOCK.SHARE
      });

      if (rol === null) {
        return { estado: 'rol_inexistente' };
      }

      // La restricción única de MySQL también protege frente
      // a solicitudes simultáneas con el mismo correo.
      const usuario = await Usuario.create({
        nombre_completo: entrada.nombre,
        email: entrada.email,
        password_hash: passwordHash,
        rol_id: rol.id,
        estado: 'activo'
      }, {
        transaction,
        fields: [
          'nombre_completo',
          'email',
          'password_hash',
          'rol_id',
          'estado'
        ]
      });

      // Devolver únicamente los datos públicos del empleado.
      return {
        estado: 'creado',
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre_completo,
          email: usuario.email,
          estado: usuario.estado,
          creadoEn: usuario.created_at,
          rol: {
            id: rol.id,
            nombre: rol.nombre
          }
        }
      };
    });
  } catch (error) {
    // La transacción ya se habrá revertido al llegar aquí.
    if (error instanceof UniqueConstraintError) {
      return { estado: 'correo_duplicado' };
    }

    // Los errores inesperados llegarán al manejador general.
    throw error;
  }
}

// Cambiar el estado y revocar los accesos cuando corresponda.
export async function cambiarEstadoUsuario({
  usuarioId,
  actorId,
  datos
}) {
  const entrada = validarCambioEstadoUsuario(datos);

  if (
    entrada === null ||
    !Number.isSafeInteger(usuarioId) ||
    usuarioId <= 0 ||
    usuarioId > 2147483647 ||
    !Number.isSafeInteger(actorId) ||
    actorId <= 0
  ) {
    return { estado: 'datos_invalidos' };
  }

  // Evitar que el operador suspenda o cese su propia cuenta.
  if (usuarioId === actorId) {
    return { estado: 'cuenta_propia' };
  }

  return sequelize.transaction(async transaction => {
    // Coordinar los cambios que podrían dejar al sistema
    // sin administradores activos.
    // Los futuros cambios de rol deberán usar este mismo bloqueo.
    const rolAdministrador = await Rol.findOne({
      where: { nombre: 'administrador' },
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (rolAdministrador === null) {
      throw new Error('No existe el rol administrador.');
    }

    // Bloquear el empleado para coordinar este cambio con el login.
    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: ['id', 'rol_id', 'estado'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (usuario === null) {
      return { estado: 'usuario_inexistente' };
    }

    if (
      usuario.rol_id === rolAdministrador.id &&
      usuario.estado === 'activo' &&
      entrada.estado !== 'activo'
    ) {
      const administradoresActivos = await Usuario.count({
        where: {
          rol_id: rolAdministrador.id,
          estado: 'activo'
        },
        transaction
      });

      if (administradoresActivos <= 1) {
        return { estado: 'ultimo_administrador' };
      }
    }

    if (usuario.estado !== entrada.estado) {
      await usuario.update({
        estado: entrada.estado
      }, {
        transaction,
        fields: ['estado']
      });
    }

    // Revocar todas las sesiones no revocadas al suspender o cesar.
    // Reactivar al empleado no restaura sus sesiones anteriores.
    if (entrada.estado !== 'activo') {
      await AuthSesion.update({
        revocada_en: new Date()
      }, {
        where: {
          usuario_id: usuario.id,
          revocada_en: null
        },
        transaction,
        fields: ['revocada_en']
      });
    }

    return {
      estado: 'actualizado',
      usuario: {
        id: usuario.id,
        estado: usuario.estado
      }
    };
  });
}

// Cambiar el rol y revocar las sesiones del empleado.
export async function cambiarRolUsuario({
  usuarioId,
  actorId,
  datos
}) {
  const entrada = validarCambioRolUsuario(datos);

  if (
    entrada === null ||
    !Number.isSafeInteger(usuarioId) ||
    usuarioId <= 0 ||
    usuarioId > 2147483647 ||
    !Number.isSafeInteger(actorId) ||
    actorId <= 0
  ) {
    return { estado: 'datos_invalidos' };
  }

  // Evitar modificaciones del propio rol desde esta operación.
  if (usuarioId === actorId) {
    return { estado: 'cuenta_propia' };
  }

  return sequelize.transaction(async transaction => {
    // Usar el mismo bloqueo que los cambios de estado.
    // Así ambas operaciones coordinan la protección
    // del último administrador activo.
    const rolAdministrador = await Rol.findOne({
      where: { nombre: 'administrador' },
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (rolAdministrador === null) {
      throw new Error('No existe el rol administrador.');
    }

    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: ['id', 'rol_id', 'estado'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (usuario === null) {
      return { estado: 'usuario_inexistente' };
    }

    const nuevoRol = await Rol.findByPk(entrada.rolId, {
      attributes: ['id', 'nombre'],
      transaction,
      lock: transaction.LOCK.SHARE
    });

    if (nuevoRol === null) {
      return { estado: 'rol_inexistente' };
    }

    const cambiaRol = usuario.rol_id !== nuevoRol.id;

    if (
      cambiaRol &&
      usuario.rol_id === rolAdministrador.id &&
      usuario.estado === 'activo'
    ) {
      const administradoresActivos = await Usuario.count({
        where: {
          rol_id: rolAdministrador.id,
          estado: 'activo'
        },
        transaction
      });

      if (administradoresActivos <= 1) {
        return { estado: 'ultimo_administrador' };
      }
    }

    if (cambiaRol) {
      await usuario.update({
        rol_id: nuevoRol.id
      }, {
        transaction,
        fields: ['rol_id']
      });

      // Exigir un nuevo login después del cambio de rol.
      await AuthSesion.update({
        revocada_en: new Date()
      }, {
        where: {
          usuario_id: usuario.id,
          revocada_en: null
        },
        transaction,
        fields: ['revocada_en']
      });
    }

    return {
      estado: 'actualizado',
      usuario: {
        id: usuario.id,
        rol: {
          id: nuevoRol.id,
          nombre: nuevoRol.nombre
        }
      }
    };
  });
}

// Restablecer la contraseña de otro empleado y cerrar sus sesiones.
export async function restablecerPasswordUsuario({
  usuarioId,
  actorId,
  datos
}) {
  const entrada = validarRestablecimientoPassword(datos);

  if (
    entrada === null ||
    !Number.isSafeInteger(usuarioId) ||
    usuarioId <= 0 ||
    usuarioId > 2147483647 ||
    !Number.isSafeInteger(actorId) ||
    actorId <= 0
  ) {
    return { estado: 'datos_invalidos' };
  }

  // Esta operación es administrativa.
  // El cambio de contraseña propia requiere un proceso separado.
  if (usuarioId === actorId) {
    return { estado: 'cuenta_propia' };
  }

  // Calcular el hash antes de abrir la transacción.
  const passwordHash = await crearHashPassword(entrada.password);

  return sequelize.transaction(async transaction => {
    // Coordinar el restablecimiento con los intentos de login.
    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (usuario === null) {
      return { estado: 'usuario_inexistente' };
    }

    // Actualizar la contraseña y reiniciar el bloqueo por intentos.
    // El estado y el rol del empleado se conservan.
    await usuario.update({
      password_hash: passwordHash,
      intentos_fallidos: 0,
      bloqueado_hasta: null
    }, {
      transaction,
      fields: [
        'password_hash',
        'intentos_fallidos',
        'bloqueado_hasta'
      ]
    });

    // Invalidar todas las sesiones anteriores del empleado.
    await AuthSesion.update({
      revocada_en: new Date()
    }, {
      where: {
        usuario_id: usuario.id,
        revocada_en: null
      },
      transaction,
      fields: ['revocada_en']
    });

    // No devolver la contraseña ni su hash.
    return {
      estado: 'restablecido'
    };
  });
}

// Revocar todas las sesiones vigentes de un empleado.
export async function revocarSesionesUsuario(usuarioId) {
  if (
    !Number.isSafeInteger(usuarioId) ||
    usuarioId <= 0 ||
    usuarioId > 2147483647
  ) {
    return { estado: 'datos_invalidos' };
  }

  return sequelize.transaction(async transaction => {
    // Coordinar la revocación con el proceso de login.
    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (usuario === null) {
      return { estado: 'usuario_inexistente' };
    }

    await AuthSesion.update({
      revocada_en: new Date()
    }, {
      where: {
        usuario_id: usuario.id,
        revocada_en: null
      },
      transaction,
      fields: ['revocada_en']
    });

    return {
      estado: 'sesiones_revocadas'
    };
  });
}