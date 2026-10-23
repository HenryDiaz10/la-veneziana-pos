import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';
import * as c from '../controllers/salon.controller.js';

const router = Router();
router.use(autenticar, exigirPermiso('mesas', 'gestionar'));
// La lectura continúa sin efectos; los comandos exigen revisión e idempotencia.
router.get('/', c.mapa);
router.get('/mesas/:id', c.detalle);
router.get('/operaciones/:tipo/:clave', c.recuperar);
router.post('/operaciones/:tipo/:clave/resolver', c.resolver);
for (const accion of ['ocupar', 'liberar', 'limpiar']) router.post(`/mesas/:id/${accion}`, c.cambiar(accion));
export default router;
