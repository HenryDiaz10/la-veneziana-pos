import {
  obtenerGruposProducto,
  asignarGrupoProducto,
  retirarGrupoProducto
} from '../services/productos-modificadores.service.js';

function leerEnteroPositivo(valor, maximo) {
  if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)) {
    return null;
  }

  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero <= maximo
    ? numero
    : null;
}

// Traducir resultados esperados sin exponer detalles internos.
function responderErrorVinculo(res, estado) {
  const errores = {
    datos_invalidos: {
      codigo: 400,
      mensaje: 'Los identificadores o la paginación no son válidos.'
    },
    producto_inexistente: {
      codigo: 404,
      mensaje: 'El producto indicado no existe.'
    },
    grupo_inexistente: {
      codigo: 404,
      mensaje: 'El grupo indicado no existe.'
    }
  };

  if (!Object.hasOwn(errores, estado)) {
    return false;
  }

  const error = errores[estado];
  res.status(error.codigo).json({ mensaje: error.mensaje });
  return true;
}

export async function listarGruposProducto(req, res, next) {
  const productoId = leerEnteroPositivo(req.params.productoId, 2147483647);
  const pagina = leerEnteroPositivo(req.query.pagina ?? '1', 10000);
  const limite = leerEnteroPositivo(req.query.limite ?? '20', 50);

  if (productoId === null || pagina === null || limite === null) {
    return res.status(400).json({
      mensaje: 'Identificador o paginación inválidos. Página máxima: 10000; límite máximo: 50.'
    });
  }

  try {
    const resultado = await obtenerGruposProducto({
      productoId,
      pagina,
      limite
    });

    if (responderErrorVinculo(res, resultado.estado)) {
      return;
    }

    if (resultado.estado !== 'consultado') {
      throw new Error('Resultado inesperado al consultar vínculos.');
    }

    return res.status(200).json({
      grupos: resultado.grupos,
      paginacion: resultado.paginacion
    });
  } catch (error) {
    return next(error);
  }
}

// Compartir comprobaciones entre asignación y retirada del vínculo.
function crearControladorVinculo(asignar) {
  return async function gestionarVinculo(req, res, next) {
    const productoId = leerEnteroPositivo(req.params.productoId, 2147483647);
    const grupoId = leerEnteroPositivo(req.params.grupoId, 2147483647);

    if (productoId === null || grupoId === null) {
      return res.status(400).json({
        mensaje: 'Los identificadores de producto y grupo no son válidos.'
      });
    }

    // Los identificadores proceden de la ruta. Aceptar cuerpo ausente o {}.
    if (
      req.body !== undefined &&
      (
        req.body === null ||
        typeof req.body !== 'object' ||
        Array.isArray(req.body) ||
        Object.keys(req.body).length > 0
      )
    ) {
      return res.status(400).json({
        mensaje: 'Esta operación no recibe campos en el cuerpo.'
      });
    }

    try {
      const operacion = asignar ? asignarGrupoProducto : retirarGrupoProducto;
      const resultado = await operacion({ productoId, grupoId });

      if (responderErrorVinculo(res, resultado.estado)) {
        return;
      }

      if (resultado.estado !== (asignar ? 'asignado' : 'retirado')) {
        throw new Error('Resultado inesperado al modificar un vínculo.');
      }

      return res.status(200).json({
        mensaje: asignar
          ? 'El grupo está asignado al producto.'
          : 'El grupo ya no está asignado al producto.',
        productoId: resultado.productoId,
        grupoId: resultado.grupoId,
        ...(asignar
          ? { creado: resultado.creado }
          : { eliminado: resultado.eliminado })
      });
    } catch (error) {
      return next(error);
    }
  };
}

export const vincularGrupoProducto = crearControladorVinculo(true);
export const desvincularGrupoProducto = crearControladorVinculo(false);
