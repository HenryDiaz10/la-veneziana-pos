import {
  obtenerItemsPaginados,
  crearItemModificador,
  actualizarItemModificador
} from '../services/modificadores-items.service.js';

function leerEnteroPositivo(valor, maximo) {
  if (
    typeof valor !== 'string' ||
    !/^[1-9]\d*$/.test(valor)
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isSafeInteger(numero) && numero <= maximo
    ? numero
    : null;
}

// Traducir los resultados esperados a respuestas públicas.
function responderErrorItem(res, estado) {
  const errores = {
    datos_invalidos: {
      codigo: 400,
      mensaje: 'Datos de opción inválidos. Revisa nombre, precio y exclusión.'
    },
    grupo_inexistente: {
      codigo: 404,
      mensaje: 'El grupo indicado no existe.'
    },
    item_inexistente: {
      codigo: 404,
      mensaje: 'La opción no existe en el grupo indicado.'
    },
    nombre_duplicado: {
      codigo: 409,
      mensaje: 'El grupo ya tiene una opción con ese nombre.'
    }
  };

  if (!Object.hasOwn(errores, estado)) {
    return false;
  }

  const error = errores[estado];

  res.status(error.codigo).json({
    mensaje: error.mensaje
  });

  return true;
}

export async function listarItems(req, res, next) {
  const grupoId = leerEnteroPositivo(req.params.grupoId, 2147483647);
  const pagina = leerEnteroPositivo(req.query.pagina ?? '1', 10000);
  const limite = leerEnteroPositivo(req.query.limite ?? '20', 50);

  if (grupoId === null || pagina === null || limite === null) {
    return res.status(400).json({
      mensaje: 'Identificador o paginación inválidos. Página máxima: 10000; límite máximo: 50.'
    });
  }

  try {
    const resultado = await obtenerItemsPaginados({
      grupoId,
      pagina,
      limite
    });

    if (responderErrorItem(res, resultado.estado)) {
      return;
    }

    if (resultado.estado !== 'consultado') {
      throw new Error('Resultado inesperado al consultar opciones.');
    }

    return res.status(200).json({
      items: resultado.items,
      paginacion: resultado.paginacion
    });
  } catch (error) {
    return next(error);
  }
}

export async function registrarItem(req, res, next) {
  const grupoId = leerEnteroPositivo(req.params.grupoId, 2147483647);

  if (grupoId === null) {
    return res.status(400).json({
      mensaje: 'El identificador del grupo no es válido.'
    });
  }

  try {
    const resultado = await crearItemModificador({
      grupoId,
      datos: req.body
    });

    if (responderErrorItem(res, resultado.estado)) {
      return;
    }

    if (resultado.estado !== 'creado') {
      throw new Error('Resultado inesperado al crear una opción.');
    }

    return res.status(201).json({
      mensaje: 'Opción creada correctamente.',
      item: resultado.item
    });
  } catch (error) {
    return next(error);
  }
}

export async function editarItem(req, res, next) {
  const grupoId = leerEnteroPositivo(req.params.grupoId, 2147483647);
  const itemId = leerEnteroPositivo(req.params.itemId, 2147483647);

  if (grupoId === null || itemId === null) {
    return res.status(400).json({
      mensaje: 'Los identificadores de grupo y opción deben ser válidos.'
    });
  }

  try {
    const resultado = await actualizarItemModificador({
      grupoId,
      itemId,
      datos: req.body
    });

    if (responderErrorItem(res, resultado.estado)) {
      return;
    }

    if (resultado.estado !== 'actualizado') {
      throw new Error('Resultado inesperado al actualizar una opción.');
    }

    return res.status(200).json({
      mensaje: 'Opción actualizada correctamente.',
      item: resultado.item
    });
  } catch (error) {
    return next(error);
  }
}