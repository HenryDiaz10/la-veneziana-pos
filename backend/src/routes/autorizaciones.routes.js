import { Router } from 'express';

import {
  registrarAutorizacion
} from '../controllers/autorizaciones.controller.js';

import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';

const autorizacionesRouter = Router();

// El servicio también comprobará el permiso de la acción concreta.
autorizacionesRouter.use(
  autenticar,
  exigirPermiso('seguridad', 'gestionar')
);

autorizacionesRouter.post('/', registrarAutorizacion);

export default autorizacionesRouter;