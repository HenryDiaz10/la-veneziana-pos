import { Op } from 'sequelize';

import { sequelize } from '../config/database.js';
import {
  ProductoVenta,
  ModificadorCatalogo,
  ProductoModificador
} from '../models/index.js';

function esIdValido(id) {
  return (
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 2147483647
  );
}

// Consultar los grupos asignados a un producto.
// No cargar automáticamente todas las opciones de cada grupo.
export async function obtenerGruposProducto({
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

  const { count, rows } = await ProductoModificador.findAndCountAll({
    attributes: ['grupo_id'],
    where: { producto_id: productoId },
    order: [['grupo_id', 'ASC']],
    limit: limite,
    offset: (pagina - 1) * limite
  });

  const ids = rows.map(vinculo => vinculo.grupo_id);

  const grupos = ids.length === 0
    ? []
    : await ModificadorCatalogo.findAll({
        attributes: [
          'id',
          'nombre_grupo',
          'es_multiple',
          'es_obligatorio'
        ],
        where: { id: { [Op.in]: ids } },
        order: [['id', 'ASC']]
      });

  return {
    estado: 'consultado',
    grupos: grupos.map(grupo => grupo.get({ plain: true })),
    paginacion: {
      pagina,
      limite,
      total: count,
      totalPaginas: Math.ceil(count / limite)
    }
  };
}

// Compartir validación y orden de bloqueo entre asignar y retirar.
async function cambiarVinculo({ productoId, grupoId, asignar }) {
  if (!esIdValido(productoId) || !esIdValido(grupoId)) {
    return { estado: 'datos_invalidos' };
  }

  return sequelize.transaction(async transaction => {
    // Mantener siempre el orden: producto y después grupo.
    const producto = await ProductoVenta.findByPk(productoId, {
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (producto === null) {
      return { estado: 'producto_inexistente' };
    }

    const grupo = await ModificadorCatalogo.findByPk(grupoId, {
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (grupo === null) {
      return { estado: 'grupo_inexistente' };
    }

    const where = {
      producto_id: productoId,
      grupo_id: grupoId
    };

    if (asignar) {
      const existente = await ProductoModificador.findOne({
        where,
        attributes: ['producto_id', 'grupo_id'],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      // Repetir la asignación no crea vínculos duplicados.
      if (existente !== null) {
        return {
          estado: 'asignado',
          creado: false,
          productoId,
          grupoId
        };
      }

      await ProductoModificador.create(where, {
        fields: ['producto_id', 'grupo_id'],
        transaction
      });

      return {
        estado: 'asignado',
        creado: true,
        productoId,
        grupoId
      };
    }

    // Eliminar solo la relación, conservando grupo, opciones y producto.
    const cantidad = await ProductoModificador.destroy({
      where,
      transaction
    });

    return {
      estado: 'retirado',
      eliminado: cantidad > 0,
      productoId,
      grupoId
    };
  });
}

export function asignarGrupoProducto({ productoId, grupoId }) {
  return cambiarVinculo({
    productoId,
    grupoId,
    asignar: true
  });
}

export function retirarGrupoProducto({ productoId, grupoId }) {
  return cambiarVinculo({
    productoId,
    grupoId,
    asignar: false
  });
}