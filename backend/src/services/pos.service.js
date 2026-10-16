import { Op } from 'sequelize';

import {
  ProductoVenta,
  CategoriaVenta,
  VarianteProducto,
  ModificadorCatalogo,
  ModificadorItem,
  ProductoModificador
} from '../models/index.js';

// Campos permitidos en las consultas operativas del catálogo de venta.
// No se exponen costos, insumos directos ni configuraciones administrativas.
const CAMPOS_PRODUCTO_POS = [
  'id',
  'nombre',
  'categoria_id',
  'precio_venta_base',
  'sku',
  'codigo_barras',
  'descripcion',
  'imagen_url',
  'tipo_producto',
  'estado'
];

const CAMPOS_VARIANTE_POS = [
  'id',
  'producto_id',
  'nombre_variante',
  'precio_adicional'
];

const CAMPOS_ITEM_POS = [
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

// Consultar categorías activas y productos disponibles para la venta.
// Excluye productos inactivos y datos de costo o inventario.
export async function obtenerCatalogoPos({ categoriaId = null, busqueda = '' } = {}) {
  // Categorías activas ordenadas para la presentación en pantalla.
  const categorias = await CategoriaVenta.findAll({
    where: { activa: true },
    attributes: ['id', 'nombre', 'slug', 'color_hex', 'icono_url', 'orden_visual'],
    order: [
      ['orden_visual', 'ASC'],
      ['nombre', 'ASC']
    ]
  });

  const condicionesProducto = {
    estado: 'activo'
  };

  if (categoriaId !== null && esIdValido(categoriaId)) {
    condicionesProducto.categoria_id = categoriaId;
  }

  const busquedaNormalizada = typeof busqueda === 'string' ? busqueda.trim() : '';
  if (busquedaNormalizada.length > 0) {
    const termino = `%${busquedaNormalizada}%`;
    condicionesProducto[Op.or] = [
      { nombre: { [Op.like]: termino } },
      { descripcion: { [Op.like]: termino } },
      { sku: { [Op.like]: termino } },
      { codigo_barras: { [Op.like]: termino } }
    ];
  }

  const productos = await ProductoVenta.findAll({
    where: condicionesProducto,
    attributes: CAMPOS_PRODUCTO_POS,
    order: [
      ['categoria_id', 'ASC'],
      ['nombre', 'ASC']
    ]
  });

  return {
    categorias: categorias.map(c => ({
      id: c.id,
      nombre: c.nombre,
      slug: c.slug,
      color_hex: c.color_hex,
      icono_url: c.icono_url,
      orden_visual: c.orden_visual
    })),
    productos: productos.map(p => ({
      id: p.id,
      nombre: p.nombre,
      categoria_id: p.categoria_id,
      precio_venta_base: p.precio_venta_base,
      sku: p.sku,
      codigo_barras: p.codigo_barras,
      descripcion: p.descripcion,
      imagen_url: p.imagen_url,
      tipo_producto: p.tipo_producto,
      estado: p.estado
    })),
    total: productos.length
  };
}

// Consultar un producto activo y su configuración completa para la venta
// (variantes activas y grupos de modificadores con sus opciones).
// Devuelve null si el producto no existe o está inactivo.
export async function obtenerProductoPos(productoId) {
  if (!esIdValido(productoId)) {
    return null;
  }

  const producto = await ProductoVenta.findOne({
    where: {
      id: productoId,
      estado: 'activo'
    },
    attributes: CAMPOS_PRODUCTO_POS
  });

  if (!producto) {
    return null;
  }

  // Variantes activas pertenecientes al producto.
  const variantes = await VarianteProducto.findAll({
    where: { producto_id: productoId },
    attributes: CAMPOS_VARIANTE_POS,
    order: [['id', 'ASC']]
  });

  // Grupos de modificadores asignados al producto.
  const vinculosGrupos = await ProductoModificador.findAll({
    where: { producto_id: productoId },
    attributes: ['grupo_id'],
    order: [['grupo_id', 'ASC']]
  });

  const gruposIds = vinculosGrupos.map(v => v.grupo_id);
  const gruposConOpciones = [];

  if (gruposIds.length > 0) {
    const grupos = await ModificadorCatalogo.findAll({
      where: { id: { [Op.in]: gruposIds } },
      attributes: ['id', 'nombre_grupo', 'es_multiple', 'es_obligatorio'],
      order: [['id', 'ASC']]
    });

    for (const grupo of grupos) {
      const opciones = await ModificadorItem.findAll({
        where: { grupo_id: grupo.id },
        attributes: CAMPOS_ITEM_POS,
        order: [['id', 'ASC']]
      });

      gruposConOpciones.push({
        id: grupo.id,
        nombre_grupo: grupo.nombre_grupo,
        es_multiple: Boolean(grupo.es_multiple),
        es_obligatorio: Boolean(grupo.es_obligatorio),
        opciones: opciones.map(op => ({
          id: op.id,
          grupo_id: op.grupo_id,
          nombre_modificador: op.nombre_modificador,
          precio_adicional: op.precio_adicional,
          es_exclusion: Boolean(op.es_exclusion)
        }))
      });
    }
  }

  return {
    producto: {
      id: producto.id,
      nombre: producto.nombre,
      categoria_id: producto.categoria_id,
      precio_venta_base: producto.precio_venta_base,
      sku: producto.sku,
      codigo_barras: producto.codigo_barras,
      descripcion: producto.descripcion,
      imagen_url: producto.imagen_url,
      tipo_producto: producto.tipo_producto,
      estado: producto.estado
    },
    configuracion: {
      productoId,
      variantes: variantes.map(v => ({
        id: v.id,
        producto_id: v.producto_id,
        nombre_variante: v.nombre_variante,
        precio_adicional: v.precio_adicional
      })),
      grupos: gruposConOpciones
    }
  };
}
