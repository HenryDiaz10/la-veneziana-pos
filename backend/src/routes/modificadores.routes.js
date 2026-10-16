import { Router } from 'express';

import {
  listarGrupos,
  registrarGrupo,
  editarGrupo
} from '../controllers/modificadores.controller.js';

import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';

import modificadoresItemsRouter from './modificadores-items.routes.js';

const modificadoresRouter = Router();

// Proteger toda la administración de grupos y sus futuras rutas hijas.
modificadoresRouter.use(
  autenticar,
  exigirPermiso('catalogo', 'gestionar')
);

modificadoresRouter.get('/', listarGrupos);
modificadoresRouter.post('/', registrarGrupo);
modificadoresRouter.patch('/:grupoId', editarGrupo);

// Opciones pertenecientes al grupo indicado.
modificadoresRouter.use('/:grupoId/items', modificadoresItemsRouter);

export default modificadoresRouter;