import { listarInventario, consultarInventario, consultarInventarioProducto } from '../services/inventario-consulta.service.js';
import { ErrorInventario } from '../services/inventario-calculo.js';
const entero = (v, maximo = 2147483647) => typeof v === 'string' && /^[1-9]\d{0,9}$/.test(v) && Number(v) <= maximo ? Number(v) : null;
const ERRORES = {
  DATOS_INVALIDOS: [400, 'Los filtros o identificadores de inventario no son válidos.'],
  INSUMO_INEXISTENTE: [404, 'El insumo no existe.'],
  PRODUCTO_INEXISTENTE: [404, 'El producto no existe.'],
  PRODUCTO_NO_DIRECTO: [409, 'Este producto no tiene un insumo de venta directa vinculado.']
};
function manejar(operacion, lista = false) {
  return async (req, res, next) => {
    try {
      const permitidos = lista ? ['pagina', 'limite', 'busqueda', 'alerta'] : ['pagina', 'limite'];
      if (Object.keys(req.query).some(k => !permitidos.includes(k)) ||
        Object.values(req.query).some(v => typeof v !== 'string')) throw new ErrorInventario('DATOS_INVALIDOS');
      const p = { pagina: entero(req.query.pagina ?? '1', 10000), limite: entero(req.query.limite ?? '20', 50) };
      res.json(await operacion(req, p));
    } catch (error) {
      if (error instanceof ErrorInventario && Object.hasOwn(ERRORES, error.codigo)) {
        const [codigo, mensaje] = ERRORES[error.codigo]; return res.status(codigo).json({ mensaje });
      }
      return next(error);
    }
  };
}
export const listar = manejar((req, p) => listarInventario({ ...p, busqueda: req.query.busqueda ?? '', alerta: req.query.alerta ?? 'todos' }), true);
export const consultar = manejar((req, p) => consultarInventario(entero(req.params.insumoId), p));
export const consultarProducto = manejar((req, p) => consultarInventarioProducto(entero(req.params.productoId), p));
