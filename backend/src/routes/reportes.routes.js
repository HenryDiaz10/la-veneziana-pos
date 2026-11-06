import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';
import { manejarComercial } from '../controllers/pedidos.controller.js';
import { consultarGerencial } from '../services/reportes.service.js';
import { listarGastos, categoriasGasto, registrarCategoriaGasto, registrarGasto } from '../services/gastos.service.js';
import { ErrorPedido } from '../services/pedidos-calculo.js';
const router = Router();
router.use(autenticar);
const consultar = operacion => async (req, res, next) => {
  try { res.json(await operacion(req.query)); }
  catch (e) {
    if (e instanceof ErrorPedido) return res.status(e.codigo === 'DATOS_INVALIDOS' ? 400 : 409).json({ codigo: e.codigo, mensaje: 'Revisa fechas, moneda, zona y filtros del reporte.' });
    next(e);
  }
};
const contexto = req => ({ usuarioId: req.auth.usuario.id, clave: req.get('Idempotency-Key') });
router.get('/gerencial', exigirPermiso('reportes', 'leer'), consultar(consultarGerencial));
router.get('/resultados', exigirPermiso('reportes', 'leer'), consultar(consultarGerencial));
router.get('/gastos', exigirPermiso('reportes', 'leer'), consultar(listarGastos));
router.get('/gastos/categorias', exigirPermiso('reportes', 'leer'), manejarComercial(() => categoriasGasto()));
// Lectura gerencial no implica poder registrar gastos. Reutilizar el permiso
// administrativo existente sin otorgarlo automáticamente a cajeros/lectores.
router.post('/gastos', exigirPermiso('configuracion', 'gestionar'), manejarComercial(req => registrarGasto(req.body, contexto(req)), 201));
router.post('/gastos/categorias', exigirPermiso('configuracion', 'gestionar'), manejarComercial(req => registrarCategoriaGasto(req.body, contexto(req)), 201));
export default router;
