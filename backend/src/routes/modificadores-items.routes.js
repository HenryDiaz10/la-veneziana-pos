import { Router } from 'express';

import {
  listarItems,
  registrarItem,
  editarItem
} from '../controllers/modificadores-items.controller.js';

// Conservar grupoId del router padre.
// La sesión y el permiso ya se comprueban en modificadoresRouter.
const modificadoresItemsRouter = Router({ mergeParams: true });

modificadoresItemsRouter.get('/', listarItems);
modificadoresItemsRouter.post('/', registrarItem);
modificadoresItemsRouter.patch('/:itemId', editarItem);

export default modificadoresItemsRouter;