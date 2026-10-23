import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';
import { consultarTareasKds, consultarTareaKds } from '../services/kds.service.js';
import { manejarComercial } from '../controllers/pedidos.controller.js';
const router = Router();
router.use(autenticar, exigirPermiso('kds', 'operar'));
// La consulta de colección valida sus propios parámetros de paginación.
router.get('/tareas', async (req, res, next) => {
  try { res.json(await consultarTareasKds(req.query)); }
  catch (e) {
    if (e.codigo === 'DATOS_INVALIDOS') return res.status(400).json({ codigo: e.codigo, mensaje: 'Revisa canal, límite y cursores KDS.' });
    if (e.codigo === 'KDS_INCONSISTENTE') return res.status(409).json({ codigo: e.codigo, mensaje: 'Una preparación necesita revisión antes de mostrar el conjunto.' });
    next(e);
  }
});
router.get('/tareas/:id', manejarComercial(req => consultarTareaKds(req.params.id)));
export default router;
