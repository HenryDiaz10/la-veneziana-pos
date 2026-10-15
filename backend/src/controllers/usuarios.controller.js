import {
  obtenerUsuariosPaginados,
  crearUsuario,
  cambiarEstadoUsuario,
  cambiarRolUsuario,
  restablecerPasswordUsuario,
  revocarSesionesUsuario
} from '../services/usuarios.service.js';

export async function listarUsuarios(req, res, next) {
  res.set('Cache-Control', 'no-store');

  const paginaTexto = req.query.pagina ?? '1';
  const limiteTexto = req.query.limite ?? '20';

  // Rechazar arreglos, objetos y valores que no sean enteros positivos.
  if (
    typeof paginaTexto !== 'string' ||
    typeof limiteTexto !== 'string' ||
    !/^[1-9]\d*$/.test(paginaTexto) ||
    !/^[1-9]\d*$/.test(limiteTexto)
  ) {
    return res.status(400).json({
      mensaje: 'Página y límite deben ser enteros positivos.'
    });
  }

  const pagina = Number(paginaTexto);
  const limite = Number(limiteTexto);

  if (
    !Number.isSafeInteger(pagina) ||
    !Number.isSafeInteger(limite) ||
    pagina > 10000 ||
    limite > 50
  ) {
    return res.status(400).json({
      mensaje: 'La página máxima es 10000 y el límite máximo es 50.'
    });
  }

  try {
    const resultado = await obtenerUsuariosPaginados({
      pagina,
      limite
    });

    return res.status(200).json(resultado);
  } catch (error) {
    return next(error);
  }
}

// Registrar un empleado y devolver únicamente sus datos públicos.
export async function registrarUsuario(req, res, next) {
  res.set('Cache-Control', 'no-store');

  try {
    const resultado = await crearUsuario(req.body);

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Datos inválidos. Revisa nombre, correo, contraseña y rol.'
      });
    }

    if (resultado.estado === 'rol_inexistente') {
      return res.status(400).json({
        mensaje: 'El rol indicado no existe.'
      });
    }

    if (resultado.estado === 'correo_duplicado') {
      return res.status(409).json({
        mensaje: 'Ya existe un usuario con ese correo.'
      });
    }

    if (resultado.estado !== 'creado') {
      throw new Error('Resultado inesperado al crear un usuario.');
    }

    return res.status(201).json({
      mensaje: 'Empleado creado correctamente.',
      usuario: resultado.usuario
    });
  } catch (error) {
    return next(error);
  }
}

// Cambiar el estado de un empleado.
export async function actualizarEstadoUsuario(req, res, next) {
  res.set('Cache-Control', 'no-store');

  const idTexto = req.params.id;

  // Aceptar únicamente identificadores enteros positivos.
  if (!/^[1-9]\d*$/.test(idTexto)) {
    return res.status(400).json({
      mensaje: 'El identificador del empleado no es válido.'
    });
  }

  const usuarioId = Number(idTexto);

  if (
    !Number.isSafeInteger(usuarioId) ||
    usuarioId > 2147483647
  ) {
    return res.status(400).json({
      mensaje: 'El identificador del empleado no es válido.'
    });
  }

  try {
    const resultado = await cambiarEstadoUsuario({
      usuarioId,

      // Obtener al operador de la autenticación.
      // Nunca aceptar su identidad desde el cuerpo recibido.
      actorId: req.auth.usuario.id,

      datos: req.body
    });

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Envía únicamente un estado: activo, suspendido o cesado.'
      });
    }

    if (resultado.estado === 'usuario_inexistente') {
      return res.status(404).json({
        mensaje: 'El empleado no existe.'
      });
    }

    if (resultado.estado === 'cuenta_propia') {
      return res.status(409).json({
        mensaje: 'No puedes cambiar el estado de tu propia cuenta.'
      });
    }

    if (resultado.estado === 'ultimo_administrador') {
      return res.status(409).json({
        mensaje: 'Debe permanecer al menos un administrador activo.'
      });
    }

    if (resultado.estado !== 'actualizado') {
      throw new Error('Resultado inesperado al cambiar el estado.');
    }

    return res.status(200).json({
      mensaje: 'Estado del empleado actualizado.',
      usuario: resultado.usuario
    });
  } catch (error) {
    return next(error);
  }
}

// Cambiar el rol asignado a un empleado.
export async function actualizarRolUsuario(req, res, next) {
  res.set('Cache-Control', 'no-store');

  const idTexto = req.params.id;

  if (!/^[1-9]\d*$/.test(idTexto)) {
    return res.status(400).json({
      mensaje: 'El identificador del empleado no es válido.'
    });
  }

  const usuarioId = Number(idTexto);

  if (
    !Number.isSafeInteger(usuarioId) ||
    usuarioId > 2147483647
  ) {
    return res.status(400).json({
      mensaje: 'El identificador del empleado no es válido.'
    });
  }

  try {
    const resultado = await cambiarRolUsuario({
      usuarioId,

      // La identidad del operador procede de la autenticación.
      actorId: req.auth.usuario.id,

      datos: req.body
    });

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Envía únicamente rolId como número entero positivo.'
      });
    }

    if (resultado.estado === 'usuario_inexistente') {
      return res.status(404).json({
        mensaje: 'El empleado no existe.'
      });
    }

    if (resultado.estado === 'rol_inexistente') {
      return res.status(400).json({
        mensaje: 'El rol indicado no existe.'
      });
    }

    if (resultado.estado === 'cuenta_propia') {
      return res.status(409).json({
        mensaje: 'No puedes cambiar tu propio rol.'
      });
    }

    if (resultado.estado === 'ultimo_administrador') {
      return res.status(409).json({
        mensaje: 'Debe permanecer al menos un administrador activo.'
      });
    }

    if (resultado.estado !== 'actualizado') {
      throw new Error('Resultado inesperado al cambiar el rol.');
    }

    return res.status(200).json({
      mensaje: 'Rol del empleado actualizado.',
      usuario: resultado.usuario
    });
  } catch (error) {
    return next(error);
  }
}

// Restablecer administrativamente la contraseña de un empleado.
export async function restablecerPassword(req, res, next) {
  res.set('Cache-Control', 'no-store');

  const idTexto = req.params.id;

  if (!/^[1-9]\d*$/.test(idTexto)) {
    return res.status(400).json({
      mensaje: 'El identificador del empleado no es válido.'
    });
  }

  const usuarioId = Number(idTexto);

  if (
    !Number.isSafeInteger(usuarioId) ||
    usuarioId > 2147483647
  ) {
    return res.status(400).json({
      mensaje: 'El identificador del empleado no es válido.'
    });
  }

  try {
    const resultado = await restablecerPasswordUsuario({
      usuarioId,

      // Obtener al operador de la sesión autenticada.
      actorId: req.auth.usuario.id,

      datos: req.body
    });

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Envía únicamente password, con al menos 12 caracteres y un máximo de 72 bytes UTF-8.'
      });
    }

    if (resultado.estado === 'usuario_inexistente') {
      return res.status(404).json({
        mensaje: 'El empleado no existe.'
      });
    }

    if (resultado.estado === 'cuenta_propia') {
      return res.status(409).json({
        mensaje: 'Esta operación no permite restablecer tu propia contraseña.'
      });
    }

    if (resultado.estado !== 'restablecido') {
      throw new Error(
        'Resultado inesperado al restablecer la contraseña.'
      );
    }

    // Confirmar el cambio sin devolver credenciales.
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

// Cerrar todas las sesiones existentes de un empleado.
export async function revocarSesiones(req, res, next) {
  res.set('Cache-Control', 'no-store');

  const idTexto = req.params.id;

  if (!/^[1-9]\d*$/.test(idTexto)) {
    return res.status(400).json({
      mensaje: 'El identificador del empleado no es válido.'
    });
  }

  const usuarioId = Number(idTexto);

  if (
    !Number.isSafeInteger(usuarioId) ||
    usuarioId > 2147483647
  ) {
    return res.status(400).json({
      mensaje: 'El identificador del empleado no es válido.'
    });
  }

  try {
    // El empleado objetivo se identifica exclusivamente por la ruta.
    const resultado = await revocarSesionesUsuario(usuarioId);

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'El identificador del empleado no es válido.'
      });
    }

    if (resultado.estado === 'usuario_inexistente') {
      return res.status(404).json({
        mensaje: 'El empleado no existe.'
      });
    }

    if (resultado.estado !== 'sesiones_revocadas') {
      throw new Error('Resultado inesperado al revocar sesiones.');
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}