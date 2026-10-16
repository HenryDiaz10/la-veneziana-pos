import {
  obtenerCatalogoPos,
  obtenerProductoPos
} from '../services/pos.service.js';

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

// Consultar catálogo operativo para el punto de venta.
export async function listarCatalogoPos(req, res, next) {
  try {
    let categoriaId = null;
    if (req.query.categoriaId !== undefined) {
      categoriaId = leerEnteroPositivo(req.query.categoriaId, 2147483647);
      if (categoriaId === null) {
        return res.status(400).json({
          mensaje: 'El identificador de categoría no es válido.'
        });
      }
    }

    let busqueda = '';
    if (req.query.busqueda !== undefined) {
      if (typeof req.query.busqueda !== 'string' || req.query.busqueda.length > 150) {
        return res.status(400).json({
          mensaje: 'La búsqueda debe ser texto de hasta 150 caracteres.'
        });
      }
      busqueda = req.query.busqueda;
    }

    const resultado = await obtenerCatalogoPos({ categoriaId, busqueda });

    return res.status(200).json(resultado);
  } catch (error) {
    return next(error);
  }
}

// Consultar un producto activo y su configuración de venta para el POS.
export async function consultarProductoPos(req, res, next) {
  const productoId = leerEnteroPositivo(req.params.id, 2147483647);

  if (productoId === null) {
    return res.status(400).json({
      mensaje: 'El identificador de producto no es válido.'
    });
  }

  try {
    const resultado = await obtenerProductoPos(productoId);

    if (!resultado) {
      return res.status(404).json({
        mensaje: 'El producto no está disponible para la venta.'
      });
    }

    return res.status(200).json(resultado);
  } catch (error) {
    return next(error);
  }
}
