import {
  obtenerCategoriasPaginadas,
  crearCategoria,
  actualizarCategoria
} from '../services/categorias.service.js';

// Admitir únicamente enteros positivos escritos sin decimales.
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

// Consultar categorías con paginación limitada.
export async function listarCategorias(req, res, next) {
  const pagina = leerEnteroPositivo(req.query.pagina ?? '1', 10000);
  const limite = leerEnteroPositivo(req.query.limite ?? '20', 50);

  if (pagina === null || limite === null) {
    return res.status(400).json({
      mensaje: 'Página y límite deben ser enteros positivos. Máximos: 10000 y 50.'
    });
  }

  try {
    const resultado = await obtenerCategoriasPaginadas({ pagina, limite });

    if (resultado.estado !== 'consultado') {
      throw new Error('Resultado inesperado al consultar categorías.');
    }

    return res.status(200).json({
      categorias: resultado.categorias,
      paginacion: resultado.paginacion
    });
  } catch (error) {
    return next(error);
  }
}

// Convertir los resultados del servicio en respuestas HTTP.
export async function registrarCategoria(req, res, next) {
  try {
    const resultado = await crearCategoria(req.body);

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Datos de categoría inválidos. Revisa los campos enviados.'
      });
    }

    if (resultado.estado === 'slug_duplicado') {
      return res.status(409).json({
        mensaje: 'Ya existe una categoría con ese slug.'
      });
    }

    if (resultado.estado !== 'creado') {
      throw new Error('Resultado inesperado al crear una categoría.');
    }

    return res.status(201).json({
      mensaje: 'Categoría creada correctamente.',
      categoria: resultado.categoria
    });
  } catch (error) {
    return next(error);
  }
}

// Actualizar campos o cambiar activa sin eliminar el registro.
export async function editarCategoria(req, res, next) {
  const categoriaId = leerEnteroPositivo(req.params.id, 2147483647);

  if (categoriaId === null) {
    return res.status(400).json({
      mensaje: 'El identificador de categoría debe ser un entero positivo válido.'
    });
  }

  try {
    const resultado = await actualizarCategoria({
      categoriaId,
      datos: req.body
    });

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Datos de categoría inválidos. Envía al menos un campo permitido.'
      });
    }

    if (resultado.estado === 'categoria_inexistente') {
      return res.status(404).json({
        mensaje: 'La categoría indicada no existe.'
      });
    }

    if (resultado.estado === 'slug_duplicado') {
      return res.status(409).json({
        mensaje: 'Ya existe una categoría con ese slug.'
      });
    }

    if (resultado.estado !== 'actualizado') {
      throw new Error('Resultado inesperado al actualizar una categoría.');
    }

    return res.status(200).json({
      mensaje: 'Categoría actualizada correctamente.',
      categoria: resultado.categoria
    });
  } catch (error) {
    return next(error);
  }
}