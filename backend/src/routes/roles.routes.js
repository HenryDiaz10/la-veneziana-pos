import { Router } from 'express';

import {
  listarRoles,
  listarPermisos,
  actualizarPermisosRol
} from '../controllers/roles.controller.js';

import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';

const rolesRouter = Router();

// Proteger todas las operaciones de roles y permisos.
rolesRouter.use(
  autenticar,
  exigirPermiso('seguridad', 'gestionar')
);

rolesRouter.get('/', listarRoles);
rolesRouter.get('/permisos', listarPermisos);
rolesRouter.put('/:id/permisos', actualizarPermisosRol);

export default rolesRouter;