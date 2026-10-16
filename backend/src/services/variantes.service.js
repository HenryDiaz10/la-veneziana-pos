import { Op } from 'sequelize';

import { sequelize } from '../config/database.js';
import {
  ProductoVenta,
  VarianteProducto
} from '../models/index.js';

import { validarVariante } from '../validators/variantes.js';

const CAMPOS_VARIANTE = [
  'id',
  'producto_id',
  'nombre_variante',
  'precio_adicional'
];

function esIdValido(id) {
  return (
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 2147483647
  );
}

// Construir la respuesta sin incluir campos adicionales de la instancia.
function serializarVariante(variante) {
  return Object.fromEntries(
    CAMPOS_VARIANTE.map(campo => [campo, variante.get(campo)])
  );
}

// Consultar exclusivamente las variantes del producto indicado.
export async function obtenerVariantesPaginadas({
  productoId,
  pagina = 1,
  limite = 20
}) {
  if (
    !esIdValido(productoId) ||
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 10000 ||
    !Number.isSafeInteger(limite) ||
    limite < 1 ||
    limite > 50
  ) {
    return { estado: 'datos_invalidos' };
  }

  const producto = await ProductoVenta.findByPk(productoId, {
    attributes: ['id']
  });

  if (producto === null) {
    return { estado: 'producto_inexistente' };
  }

  const { count, rows } = await VarianteProducto.findAndCountAll({
    attributes: CAMPOS_VARIANTE,
    where: { producto_id: productoId },
    order: [['id', 'ASC']],
    limit: limite,
    offset: (pagina - 1) * limite
  });

  return {
    estado: 'consultado',
    variantes: rows.map(serializarVariante),
    paginacion: {
      pagina,
      limite,
      total: count,
      totalPaginas: Math.ceil(count / limite)
    }
  };
}

// El producto propietario procede de la ruta, nunca del cuerpo JSON.
export async function crearVariante({ productoId, datos }) {
  const entrada = validarVariante(datos);

  if (!esIdValido(productoId) || entrada === null) {
    return { estado: 'datos_invalidos' };
  }

  return sequelize.transaction(async transaction => {
    // Serializar las escrituras de variantes del mismo producto.
    const producto = await ProductoVenta.findByPk(productoId, {
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (producto === null) {
      return { estado: 'producto_inexistente' };
    }

    // El esquema no tiene UNIQUE para el nombre.
    // Comprobarlo bajo el bloqueo del producto propietario.
    const repetida = await VarianteProducto.findOne({
      where: {
        producto_id: productoId,
        nombre_variante: entrada.nombre_variante
      },
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (repetida !== null) {
      return { estado: 'nombre_duplicado' };
    }

    const valores = {
      precio_adicional: '0.00',
      ...entrada,
      producto_id: productoId
    };

    const variante = await VarianteProducto.create(valores, {
      fields: Object.keys(valores),
      transaction
    });

    await variante.reload({
      attributes: CAMPOS_VARIANTE,
      transaction
    });

    return {
      estado: 'creado',
      variante: serializarVariante(variante)
    };
  });
}

// Comprobar conjuntamente el ID de variante y su producto propietario.
export async function actualizarVariante({
  productoId,
  varianteId,
  datos
}) {
  const entrada = validarVariante(datos, { parcial: true });

  if (
    !esIdValido(productoId) ||
    !esIdValido(varianteId) ||
    entrada === null
  ) {
    return { estado: 'datos_invalidos' };
  }

  return sequelize.transaction(async transaction => {
    // Mantener el mismo orden de bloqueo que en el alta.
    const producto = await ProductoVenta.findByPk(productoId, {
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (producto === null) {
      return { estado: 'producto_inexistente' };
    }

    const variante = await VarianteProducto.findOne({
      where: {
        id: varianteId,
        producto_id: productoId
      },
      attributes: CAMPOS_VARIANTE,
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (variante === null) {
      return { estado: 'variante_inexistente' };
    }

    if (Object.hasOwn(entrada, 'nombre_variante')) {
      const repetida = await VarianteProducto.findOne({
        where: {
          producto_id: productoId,
          nombre_variante: entrada.nombre_variante,
          id: { [Op.ne]: varianteId }
        },
        attributes: ['id'],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (repetida !== null) {
        return { estado: 'nombre_duplicado' };
      }
    }

    await variante.update(entrada, {
      fields: Object.keys(entrada),
      transaction
    });

    await variante.reload({
      attributes: CAMPOS_VARIANTE,
      transaction
    });

    return {
      estado: 'actualizado',
      variante: serializarVariante(variante)
    };
  });
}