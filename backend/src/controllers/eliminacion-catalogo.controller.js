import {
  eliminarProductoSinRelaciones, eliminarCategoriaSinRelaciones
} from '../services/eliminacion-catalogo.service.js';

function crearControladorEliminar(operacion, tipo) {
  return async function eliminarRegistro(req, res, next) {
    const texto = req.params.id;
    const id = typeof texto === 'string' && /^[1-9]\d*$/.test(texto)
      ? Number(texto) : NaN;
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
      return res.status(400).json({ mensaje: 'El identificador no es válido.' });
    }
    if (!req.body || Array.isArray(req.body) || req.body.confirmar !== true ||
        Object.keys(req.body).length !== 1) {
      return res.status(400).json({ mensaje: 'Confirma expresamente la eliminación.' });
    }
    try {
      const resultado = await operacion(id);
      if (resultado.estado === 'inexistente') {
        return res.status(404).json({ mensaje: `No se encontró ${tipo}.` });
      }
      if (resultado.estado === 'con_relaciones') {
        return res.status(409).json({
          mensaje: `No se puede eliminar ${tipo} porque tiene registros asociados. Puedes desactivar ${tipo} para conservar su historial.`
        });
      }
      if (resultado.estado !== 'eliminado') throw new Error('Resultado inesperado al eliminar catálogo.');
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  };
}

export const eliminarProducto = crearControladorEliminar(eliminarProductoSinRelaciones, 'el producto');
export const eliminarCategoria = crearControladorEliminar(eliminarCategoriaSinRelaciones, 'la categoría');
