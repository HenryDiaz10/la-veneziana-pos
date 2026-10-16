import {
  obtenerProductosPaginados,
  obtenerProductoCarrito,
  crearProducto,
  actualizarProducto
} from '../services/productos.service.js';
import { normalizarBusquedaProducto } from '../validators/productos.js';

// Consulta administrativa puntual para recuperar selecciones del borrador.
export async function consultarProducto(req, res, next) {
  if (!/^[1-9]\d*$/.test(req.params.id) || Number(req.params.id) > 2147483647) {
    return res.status(400).json({ mensaje: 'El identificador no es válido.' });
  }
  try {
    const producto = await obtenerProductoCarrito(Number(req.params.id));
    if (!producto) return res.status(404).json({ mensaje: 'El producto ya no existe.' });
    return res.json({ producto });
  } catch (error) { return next(error); }
}

// Traducir los resultados esperados sin exponer errores internos.
const ERRORES_PRODUCTO = {
  datos_invalidos: {
    codigo: 400,
    mensaje: 'Datos de producto inválidos. Revisa los campos y el precio.'
  },
  categoria_inexistente: {
    codigo: 400,
    mensaje: 'La categoría indicada no existe.'
  },
  categoria_inactiva: {
    codigo: 409,
    mensaje: 'Un producto activo requiere una categoría activa.'
  },
  configuracion_invalida: {
    codigo: 400,
    mensaje: 'Revisa el tipo de producto, el control de stock y el insumo directo.'
  },
  insumo_inexistente: {
    codigo: 400,
    mensaje: 'El insumo indicado no existe.'
  },
  insumo_inactivo: {
    codigo: 409,
    mensaje: 'Un producto directo activo requiere un insumo activo.'
  },
  codigo_duplicado: {
    codigo: 409,
    mensaje: 'El SKU o el código de barras ya está registrado.'
  },
  producto_inexistente: {
    codigo: 404,
    mensaje: 'El producto indicado no existe.'
  }
};

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

// Devolver true cuando ya se respondió un error conocido.
function responderErrorProducto(res, estado) {
  if (!Object.hasOwn(ERRORES_PRODUCTO, estado)) {
    return false;
  }

  const error = ERRORES_PRODUCTO[estado];

  res.status(error.codigo).json({
    mensaje: error.mensaje
  });

  return true;
}

export async function listarProductos(req, res, next) {
  const pagina = leerEnteroPositivo(req.query.pagina ?? '1', 10000);
  const limite = leerEnteroPositivo(req.query.limite ?? '20', 50);
  const busqueda = normalizarBusquedaProducto(req.query.busqueda);

  if (busqueda === null) {
    return res.status(400).json({
      mensaje: 'La búsqueda debe ser texto de hasta 150 caracteres válidos.'
    });
  }

  if (pagina === null || limite === null) {
    return res.status(400).json({
      mensaje: 'Página y límite deben ser enteros positivos. Máximos: 10000 y 50.'
    });
  }

  try {
    const resultado = await obtenerProductosPaginados({ pagina, limite, busqueda });

    if (resultado.estado !== 'consultado') {
      throw new Error('Resultado inesperado al consultar productos.');
    }

    return res.status(200).json({
      productos: resultado.productos,
      paginacion: resultado.paginacion
    });
  } catch (error) {
    return next(error);
  }
}

export async function registrarProducto(req, res, next) {
  try {
    const resultado = await crearProducto(req.body);

    if (responderErrorProducto(res, resultado.estado)) {
      return;
    }

    if (resultado.estado !== 'creado') {
      throw new Error('Resultado inesperado al crear un producto.');
    }

    return res.status(201).json({
      mensaje: 'Producto creado correctamente.',
      producto: resultado.producto
    });
  } catch (error) {
    return next(error);
  }
}

export async function editarProducto(req, res, next) {
  const productoId = leerEnteroPositivo(req.params.id, 2147483647);

  if (productoId === null) {
    return res.status(400).json({
      mensaje: 'El identificador de producto debe ser un entero positivo válido.'
    });
  }

  try {
    const resultado = await actualizarProducto({
      productoId,
      datos: req.body
    });

    if (responderErrorProducto(res, resultado.estado)) {
      return;
    }

    if (resultado.estado !== 'actualizado') {
      throw new Error('Resultado inesperado al actualizar un producto.');
    }

    return res.status(200).json({
      mensaje: 'Producto actualizado correctamente.',
      producto: resultado.producto
    });
  } catch (error) {
    return next(error);
  }
}
