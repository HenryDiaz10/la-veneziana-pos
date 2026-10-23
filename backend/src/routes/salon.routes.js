import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';
import { consultarSalon } from '../services/salon.service.js';

const router = Router();
router.use(autenticar, exigirPermiso('mesas', 'gestionar'));
// Contrato de solo lectura: rechazar parámetros que aparenten modificar o filtrar.
router.get('/', async (req, res, next) => {
  if (Object.keys(req.query).length) return res.status(400).json({ mensaje: 'Esta consulta no admite parámetros.' });
  try { res.json(await consultarSalon()); } catch (error) { next(error); }
});
export default router;
