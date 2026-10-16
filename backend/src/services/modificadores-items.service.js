import { Op } from 'sequelize';

import { sequelize } from '../config/database.js';
import {
  ModificadorCatalogo,
  ModificadorItem
} from '../models/index.js';

import {
  validarItemModificador
} from '../validators/modificadores.js';

const CAMPOS_ITEM = [
  'id',
  'grupo_id',
  'nombre_modificador',
  'precio_adicional',
  'es_exclusion'
];

function esIdValido(id) {
  return (
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 2147483647
  );
}

function serializarItem(item) {
  return Object.fromEntries(
    CAMPOS_ITEM.map(campo => [campo, item.get(campo)])
  );
}

// Listar exclusivamente las opciones del grupo indicado.
export async function obtenerItemsPaginados({
  grupoId,
  pagina = 1,
  limite = 20
}) {
  if (
    !esIdValido(grupoId) ||
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 10000 ||
    !Number.isSafeInteger(limite) ||
    limite < 1 ||
    limite > 50
  ) {
    return { estado: 'datos_invalidos' };
  }

  const grupo = await ModificadorCatalogo.findByPk(grupoId, {
    attributes: ['id']
  });

  if (grupo === null) {
    return { estado: 'grupo_inexistente' };
  }

  const { count, rows } = await ModificadorItem.findAndCountAll({
    attributes: CAMPOS_ITEM,
    where: { grupo_id: grupoId },
    order: [['id', 'ASC']],
    limit: limite,
    offset: (pagina - 1) * limite
  });

  return {
    estado: 'consultado',
    items: rows.map(serializarItem),
    paginacion: {
      pagina,
      limite,
      total: count,
      totalPaginas: Math.ceil(count / limite)
    }
  };
}

// El grupo propietario viene de la ruta, nunca del cuerpo JSON.
export async function crearItemModificador({ grupoId, datos }) {
  const entrada = validarItemModificador(datos);

  if (!esIdValido(grupoId) || entrada === null) {
    return { estado: 'datos_invalidos' };
  }

  return sequelize.transaction(async transaction => {
    // Serializar las escrituras de opciones del mismo grupo.
    const grupo = await ModificadorCatalogo.findByPk(grupoId, {
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (grupo === null) {
      return { estado: 'grupo_inexistente' };
    }

    // Evitar nombres repetidos dentro de este grupo.
    const repetido = await ModificadorItem.findOne({
      where: {
        grupo_id: grupoId,
        nombre_modificador: entrada.nombre_modificador
      },
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (repetido !== null) {
      return { estado: 'nombre_duplicado' };
    }

    const valores = {
      precio_adicional: '0.00',
      es_exclusion: false,
      ...entrada,
      grupo_id: grupoId
    };

    const item = await ModificadorItem.create(valores, {
      fields: Object.keys(valores),
      transaction
    });

    await item.reload({
      attributes: CAMPOS_ITEM,
      transaction
    });

    return {
      estado: 'creado',
      item: serializarItem(item)
    };
  });
}

// No permitir editar una opción mediante la ruta de otro grupo.
export async function actualizarItemModificador({
  grupoId,
  itemId,
  datos
}) {
  const entrada = validarItemModificador(datos, { parcial: true });

  if (
    !esIdValido(grupoId) ||
    !esIdValido(itemId) ||
    entrada === null
  ) {
    return { estado: 'datos_invalidos' };
  }

  return sequelize.transaction(async transaction => {
    // Mantener el mismo orden de bloqueo que en el alta.
    const grupo = await ModificadorCatalogo.findByPk(grupoId, {
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (grupo === null) {
      return { estado: 'grupo_inexistente' };
    }

    const item = await ModificadorItem.findOne({
      where: {
        id: itemId,
        grupo_id: grupoId
      },
      attributes: CAMPOS_ITEM,
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (item === null) {
      return { estado: 'item_inexistente' };
    }

    if (Object.hasOwn(entrada, 'nombre_modificador')) {
      const repetido = await ModificadorItem.findOne({
        where: {
          grupo_id: grupoId,
          nombre_modificador: entrada.nombre_modificador,
          id: { [Op.ne]: itemId }
        },
        attributes: ['id'],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (repetido !== null) {
        return { estado: 'nombre_duplicado' };
      }
    }

    await item.update(entrada, {
      fields: Object.keys(entrada),
      transaction
    });

    await item.reload({
      attributes: CAMPOS_ITEM,
      transaction
    });

    return {
      estado: 'actualizado',
      item: serializarItem(item)
    };
  });
}