import { UniqueConstraintError, Op, fn, col, where } from 'sequelize';

import { sequelize } from '../config/database.js';
import {
  ProductoVenta,
  CategoriaVenta,
  InsumoAlmacen
} from '../models/index.js';

import { validarProducto, normalizarBusquedaProducto } from '../validators/productos.js';

// Excluir stock y campos calculados de las operaciones de escritura.
// Los campos devueltos se seleccionan expresamente.
const CAMPOS_PRODUCTO = [
  'id',
  'nombre',
  'categoria_id',
  'precio_venta_base',
  'sku',
  'codigo_barras',
  'descripcion',
  'imagen_url',
  'tipo_producto',
  'controla_stock',
  'puntos_recompensa',
  'estado',
  'insumo_directo_id',
  'created_at',
  'updated_at'
];

// No depender de reload para filtrar la instancia: puede conservar defaults.
function serializarProducto(producto) {
  return Object.fromEntries(
    CAMPOS_PRODUCTO.map(campo => [campo, producto.get(campo)])
  );
}

function esIdValido(id) {
  return (
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 2147483647
  );
}

// Recuperar un producto concreto al rehidratar un borrador, sin recorrer
// todas las páginas del catálogo ni confiar en precios guardados localmente.
export async function obtenerProductoCarrito(id) {
  if (!esIdValido(id)) return null;
  const producto = await ProductoVenta.findByPk(id, { attributes: CAMPOS_PRODUCTO });
  return producto ? serializarProducto(producto) : null;
}

// Comprobar la configuración completa, incluso en cambios parciales.
async function comprobarRelaciones(producto, transaction) {
  const categoria = await CategoriaVenta.findByPk(
    producto.categoria_id,
    {
      attributes: ['id', 'activa'],
      transaction,
      lock: transaction.LOCK.UPDATE
    }
  );

  if (categoria === null) {
    return 'categoria_inexistente';
  }

  // Permitir conservar y desactivar productos de categorías inactivas.
  // Para dejar un producto activo, su categoría debe estar activa.
  if (producto.estado === 'activo' && !categoria.activa) {
    return 'categoria_inactiva';
  }

  const esDirecto = producto.tipo_producto === 'producto_directo';
  const tieneInsumo = producto.insumo_directo_id !== null;

  // El producto directo necesita su insumo asociado.
  // Platos preparados y combos no utilizan insumo_directo_id.
  if (
    (esDirecto && !tieneInsumo) ||
    (!esDirecto && tieneInsumo) ||
    (!esDirecto && producto.controla_stock)
  ) {
    return 'configuracion_invalida';
  }

  if (esDirecto) {
    const insumo = await InsumoAlmacen.findByPk(
      producto.insumo_directo_id,
      {
        attributes: ['id', 'activo'],
        transaction,
        lock: transaction.LOCK.UPDATE
      }
    );

    if (insumo === null) {
      return 'insumo_inexistente';
    }

    if (producto.estado === 'activo' && !insumo.activo) {
      return 'insumo_inactivo';
    }
  }

  return null;
}

// Consultar una página; no devolver todo el catálogo de una vez.
export async function obtenerProductosPaginados({
  pagina = 1,
  limite = 20,
  busqueda = ''
} = {}) {
  const termino = normalizarBusquedaProducto(busqueda);
  if (
    termino === null ||
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 10000 ||
    !Number.isSafeInteger(limite) ||
    limite < 1 ||
    limite > 50
  ) {
    return { estado: 'datos_invalidos' };
  }

  const { count, rows } = await ProductoVenta.findAndCountAll({
    attributes: CAMPOS_PRODUCTO,
    // Buscar en todos los productos antes de paginar. LOCATE trata % y _
    // como texto literal; Sequelize escapa el valor, sin concatenar SQL.
    where: termino ? {
      [Op.or]: ['nombre', 'sku', 'codigo_barras'].map(campo =>
        where(fn('LOCATE', termino, col(campo)), { [Op.gt]: 0 })
      )
    } : {},
    order: [['id', 'ASC']],
    limit: limite,
    offset: (pagina - 1) * limite
  });

  return {
    estado: 'consultado',
    productos: rows.map(serializarProducto),
    paginacion: {
      pagina,
      limite,
      total: count,
      totalPaginas: Math.ceil(count / limite)
    }
  };
}

// Registrar un producto con campos y relaciones validados.
export async function crearProducto(datos) {
  const entrada = validarProducto(datos);

  if (entrada === null) {
    return { estado: 'datos_invalidos' };
  }

  // Explicitar los valores que intervienen en las reglas de relación.
  const configuracion = {
    tipo_producto: 'plato_preparado',
    controla_stock: false,
    estado: 'activo',
    insumo_directo_id: null,
    ...entrada
  };

  try {
    return await sequelize.transaction(async transaction => {
      const problema = await comprobarRelaciones(
        configuracion,
        transaction
      );

      if (problema !== null) {
        return { estado: problema };
      }

      const producto = await ProductoVenta.create(configuracion, {
        fields: Object.keys(configuracion),
        transaction
      });

      await producto.reload({
        attributes: CAMPOS_PRODUCTO,
        transaction
      });

      return {
        estado: 'creado',
        producto: serializarProducto(producto)
      };
    });
  } catch (error) {
    // MySQL garantiza la unicidad también con solicitudes simultáneas.
    if (error instanceof UniqueConstraintError) {
      return { estado: 'codigo_duplicado' };
    }

    throw error;
  }
}

// Actualizar sin borrar el producto ni sus relaciones históricas.
export async function actualizarProducto({ productoId, datos }) {
  const entrada = validarProducto(datos, { parcial: true });

  if (!esIdValido(productoId) || entrada === null) {
    return { estado: 'datos_invalidos' };
  }

  try {
    return await sequelize.transaction(async transaction => {
      const producto = await ProductoVenta.findByPk(productoId, {
        attributes: CAMPOS_PRODUCTO,
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (producto === null) {
        return { estado: 'producto_inexistente' };
      }

      // Combinar el estado actual y los cambios antes de validar.
      const configuracion = {
        ...producto.get({ plain: true }),
        ...entrada
      };

      const problema = await comprobarRelaciones(
        configuracion,
        transaction
      );

      if (problema !== null) {
        return { estado: problema };
      }

      // Guardar exclusivamente los campos recibidos y validados.
      await producto.update(entrada, {
        fields: Object.keys(entrada),
        transaction
      });

      await producto.reload({
        attributes: CAMPOS_PRODUCTO,
        transaction
      });

      return {
        estado: 'actualizado',
        producto: serializarProducto(producto)
      };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return { estado: 'codigo_duplicado' };
    }

    throw error;
  }
}
