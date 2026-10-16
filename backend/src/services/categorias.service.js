import { UniqueConstraintError } from 'sequelize';

import { sequelize } from '../config/database.js';
import { CategoriaVenta } from '../models/index.js';
import { validarCategoria } from '../validators/categorias.js';

// Seleccionar expresamente los campos que devuelve la API.
const CAMPOS_CATEGORIA = [
  'id',
  'nombre',
  'slug',
  'color_hex',
  'orden_visual',
  'icono_url',
  'es_para_kds',
  'activa'
];

function esIdValido(id) {
  return (
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 2147483647
  );
}

// Consultar categorías con un límite de registros por página.
export async function obtenerCategoriasPaginadas({
  pagina = 1,
  limite = 20
} = {}) {
  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 10000 ||
    !Number.isSafeInteger(limite) ||
    limite < 1 ||
    limite > 50
  ) {
    return { estado: 'datos_invalidos' };
  }

  const { count, rows } = await CategoriaVenta.findAndCountAll({
    attributes: CAMPOS_CATEGORIA,
    order: [
      ['orden_visual', 'ASC'],
      ['id', 'ASC']
    ],
    limit: limite,
    offset: (pagina - 1) * limite
  });

  return {
    estado: 'consultado',
    categorias: rows.map(categoria => categoria.get({ plain: true })),
    paginacion: {
      pagina,
      limite,
      total: count,
      totalPaginas: Math.ceil(count / limite)
    }
  };
}

// Crear una categoría utilizando únicamente campos validados.
export async function crearCategoria(datos) {
  const entrada = validarCategoria(datos);

  if (entrada === null) {
    return { estado: 'datos_invalidos' };
  }

  try {
    const categoria = await sequelize.transaction(async transaction => {
      const creada = await CategoriaVenta.create(entrada, {
        fields: Object.keys(entrada),
        transaction
      });

      // Recuperar también los valores predeterminados de MySQL.
      await creada.reload({
        attributes: CAMPOS_CATEGORIA,
        transaction
      });

      return creada.get({ plain: true });
    });

    return {
      estado: 'creado',
      categoria
    };
  } catch (error) {
    // La restricción UNIQUE también protege altas simultáneas.
    if (error instanceof UniqueConstraintError) {
      return { estado: 'slug_duplicado' };
    }

    throw error;
  }
}

// Actualizar solo los campos enviados.
// Permite activar o desactivar sin borrar físicamente la categoría.
export async function actualizarCategoria({ categoriaId, datos }) {
  const entrada = validarCategoria(datos, { parcial: true });

  if (!esIdValido(categoriaId) || entrada === null) {
    return { estado: 'datos_invalidos' };
  }

  try {
    return await sequelize.transaction(async transaction => {
      // Serializar las modificaciones concurrentes de esta categoría.
      const categoria = await CategoriaVenta.findByPk(categoriaId, {
        attributes: CAMPOS_CATEGORIA,
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (categoria === null) {
        return { estado: 'categoria_inexistente' };
      }

      await categoria.update(entrada, {
        fields: Object.keys(entrada),
        transaction
      });

      await categoria.reload({
        attributes: CAMPOS_CATEGORIA,
        transaction
      });

      return {
        estado: 'actualizado',
        categoria: categoria.get({ plain: true })
      };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return { estado: 'slug_duplicado' };
    }

    // Los errores inesperados llegarán al manejador general.
    throw error;
  }
}