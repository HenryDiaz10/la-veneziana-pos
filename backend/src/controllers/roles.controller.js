import {
  obtenerRolesConPermisos,
  obtenerPermisos,
  asignarPermisosRol
} from '../services/roles.service.js';

// Listar los roles junto con sus permisos.
export async function listarRoles(req, res, next) {
  res.set('Cache-Control', 'no-store');

  try {
    const resultado = await obtenerRolesConPermisos();
    return res.status(200).json(resultado);
  } catch (error) {
    return next(error);
  }
}

// Listar los permisos disponibles para asignar.
export async function listarPermisos(req, res, next) {
  res.set('Cache-Control', 'no-store');

  try {
    const resultado = await obtenerPermisos();
    return res.status(200).json(resultado);
  } catch (error) {
    return next(error);
  }
}

// Reemplazar los permisos asignados a un rol.
export async function actualizarPermisosRol(req, res, next) {
  res.set('Cache-Control', 'no-store');

  const idTexto = req.params.id;

  if (!/^[1-9]\d*$/.test(idTexto)) {
    return res.status(400).json({
      mensaje: 'El identificador del rol no es válido.'
    });
  }

  const rolId = Number(idTexto);

  if (
    !Number.isSafeInteger(rolId) ||
    rolId > 2147483647
  ) {
    return res.status(400).json({
      mensaje: 'El identificador del rol no es válido.'
    });
  }

  try {
    const resultado = await asignarPermisosRol({
      rolId,
      actorId: req.auth.usuario.id,
      datos: req.body
    });

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Envía únicamente permisoIds como una lista de hasta 100 identificadores enteros positivos, sin repetidos.'
      });
    }

    if (resultado.estado === 'actor_invalido') {
      res.set('WWW-Authenticate', 'Bearer');

      return res.status(401).json({
        mensaje: 'Autenticación requerida.'
      });
    }

    if (resultado.estado === 'rol_inexistente') {
      return res.status(404).json({
        mensaje: 'El rol no existe.'
      });
    }

    if (resultado.estado === 'permiso_inexistente') {
      return res.status(400).json({
        mensaje: 'Uno o más permisos no existen.'
      });
    }

    if (resultado.estado === 'rol_protegido') {
      return res.status(409).json({
        mensaje: 'Esta operación no permite modificar los permisos del rol administrador.'
      });
    }

    if (resultado.estado === 'rol_propio') {
      return res.status(409).json({
        mensaje: 'No puedes modificar los permisos de tu propio rol.'
      });
    }

    if (resultado.estado !== 'actualizado') {
      throw new Error('Resultado inesperado al asignar permisos.');
    }

    return res.status(200).json({
      mensaje: 'Permisos del rol actualizados.',
      rol: resultado.rol
    });
  } catch (error) {
    return next(error);
  }
}