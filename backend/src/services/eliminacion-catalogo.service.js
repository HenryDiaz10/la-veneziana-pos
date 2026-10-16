import { ForeignKeyConstraintError, Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  CategoriaVenta, ProductoVenta, VarianteProducto, ProductoModificador,
  RecetaBom, PedidoItemKds, KdsTarea, ComboComponente
} from '../models/index.js';

// Incluir también relaciones CASCADE: no borrar variantes ni vínculos
// silenciosamente al eliminar un producto creado por error.
const RELACIONES_PRODUCTO = [
  [VarianteProducto, id => ({ producto_id: id })],
  [ProductoModificador, id => ({ producto_id: id })],
  [RecetaBom, id => ({ producto_venta_id: id })],
  [PedidoItemKds, id => ({ producto_venta_id: id })],
  [KdsTarea, id => ({ producto_id: id })],
  [ComboComponente, id => ({ [Op.or]: [{ combo_id: id }, { producto_id: id }] })]
];

async function eliminarSinRelaciones(Modelo, id, relaciones) {
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    return { estado: 'datos_invalidos' };
  }
  try {
    return await sequelize.transaction(async transaction => {
      // El bloqueo impide insertar nuevos hijos con FK mientras comprobamos.
      const registro = await Modelo.findByPk(id, {
        attributes: ['id'], transaction, lock: transaction.LOCK.UPDATE
      });
      if (!registro) return { estado: 'inexistente' };

      for (const [Relacionado, filtro] of relaciones) {
        const vinculo = await Relacionado.findOne({
          attributes: Relacionado.primaryKeyAttributes,
          where: filtro(id), transaction
        });
        if (vinculo) return { estado: 'con_relaciones' };
      }

      // No eliminar ni desvincular hijos para forzar el borrado.
      await registro.destroy({ transaction });
      return { estado: 'eliminado' };
    });
  } catch (error) {
    // Conservar además la protección de las FK de MySQL.
    if (error instanceof ForeignKeyConstraintError) return { estado: 'con_relaciones' };
    throw error;
  }
}

export function eliminarProductoSinRelaciones(productoId) {
  return eliminarSinRelaciones(ProductoVenta, productoId, RELACIONES_PRODUCTO);
}

export function eliminarCategoriaSinRelaciones(categoriaId) {
  return eliminarSinRelaciones(CategoriaVenta, categoriaId, [
    [ProductoVenta, id => ({ categoria_id: id })]
  ]);
}
