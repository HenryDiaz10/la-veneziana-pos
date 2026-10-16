import { Router } from 'express';

import {
  listarCategorias,
  registrarCategoria,
  editarCategoria
} from '../controllers/categorias.controller.js';

import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';
import { eliminarCategoria } from '../controllers/eliminacion-catalogo.controller.js';

const categoriasRouter = Router();

// Autorizar todas las operaciones de administración de categorías.
categoriasRouter.use(
  autenticar,
  exigirPermiso('catalogo', 'gestionar')
);

categoriasRouter.get('/', listarCategorias);
categoriasRouter.post('/', registrarCategoria);
categoriasRouter.patch('/:id', editarCategoria);
categoriasRouter.delete('/:id', eliminarCategoria);

export default categoriasRouter;
