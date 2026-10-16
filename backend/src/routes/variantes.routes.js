import { Router } from 'express';

import {
  listarVariantes,
  registrarVariante,
  editarVariante
} from '../controllers/variantes.controller.js';

// Conservar productoId recibido desde productosRouter.
// La autenticación y el permiso se comprueban en ese router.
const variantesRouter = Router({ mergeParams: true });

variantesRouter.get('/', listarVariantes);
variantesRouter.post('/', registrarVariante);
variantesRouter.patch('/:varianteId', editarVariante);

export default variantesRouter;