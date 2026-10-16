import {
  obtenerVariantesPaginadas,
  crearVariante,
  actualizarVariante
} from '../services/variantes.service.js';

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

// Traducir resultados esperados a respuestas públicas.
function responderErrorVariante(res, estado) {
  const errores = {
    datos_invalidos: {
      codigo: 400,
      mensaje: 'Datos de variante inválidos. Revisa el nombre y el precio adicional.'
    },
    producto_inexistente: {
      codigo: 404,
      mensaje: 'El producto indicado no existe.'
    },
    variante_inexistente: {
      codigo: 404,
      mensaje: 'La variante no existe en el producto indicado.'
    },
    nombre_duplicado: {
      codigo: 409,
      mensaje: 'El producto ya tiene una variante con ese nombre.'
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

export async function listarVariantes(req, res, next) {
  const productoId = leerEnteroPositivo(req.params.productoId, 2147483647);
  const pagina = leerEnteroPositivo(req.query.pagina ?? '1', 10000);
  const limite = leerEnteroPositivo(req.query.limite ?? '20', 50);

  if (productoId === null || pagina === null || limite === null) {
    return res.status(400).json({
      mensaje: 'Identificador o paginación inválidos. Página máxima: 10000; límite máximo: 50.'
    });
  }

  try {
    const resultado = await obtenerVariantesPaginadas({
      productoId,
      pagina,
      limite
    });

    if (responderErrorVariante(res, resultado.estado)) {
      return;
    }

    if (resultado.estado !== 'consultado') {
      throw new Error('Resultado inesperado al consultar variantes.');
    }

    return res.status(200).json({
      variantes: resultado.variantes,
      paginacion: resultado.paginacion
    });
  } catch (error) {
    return next(error);
  }
}

export async function registrarVariante(req, res, next) {
  const productoId = leerEnteroPositivo(req.params.productoId, 2147483647);

  if (productoId === null) {
    return res.status(400).json({
      mensaje: 'El identificador de producto no es válido.'
    });
  }

  try {
    const resultado = await crearVariante({
      productoId,
      datos: req.body
    });

    if (responderErrorVariante(res, resultado.estado)) {
      return;
    }

    if (resultado.estado !== 'creado') {
      throw new Error('Resultado inesperado al crear una variante.');
    }

    return res.status(201).json({
      mensaje: 'Variante creada correctamente.',
      variante: resultado.variante
    });
  } catch (error) {
    return next(error);
  }
}

export async function editarVariante(req, res, next) {
  const productoId = leerEnteroPositivo(req.params.productoId, 2147483647);
  const varianteId = leerEnteroPositivo(req.params.varianteId, 2147483647);

  if (productoId === null || varianteId === null) {
    return res.status(400).json({
      mensaje: 'Los identificadores de producto y variante deben ser válidos.'
    });
  }

  try {
    const resultado = await actualizarVariante({
      productoId,
      varianteId,
      datos: req.body
    });

    if (responderErrorVariante(res, resultado.estado)) {
      return;
    }

    if (resultado.estado !== 'actualizado') {
      throw new Error('Resultado inesperado al actualizar una variante.');
    }

    return res.status(200).json({
      mensaje: 'Variante actualizada correctamente.',
      variante: resultado.variante
    });
  } catch (error) {
    return next(error);
  }
}