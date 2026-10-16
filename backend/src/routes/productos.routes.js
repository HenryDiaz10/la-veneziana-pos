import { Router } from 'express';

import {
  listarProductos,
  consultarProducto,
  registrarProducto,
  editarProducto
} from '../controllers/productos.controller.js';

import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';

import variantesRouter from './variantes.routes.js';
import { eliminarProducto } from '../controllers/eliminacion-catalogo.controller.js';
import productosModificadoresRouter from './productos-modificadores.routes.js';

const productosRouter = Router();

// Estas rutas administran el catálogo.
// La consulta operativa del POS se incorporará con su propio alcance.
productosRouter.use(
  autenticar,
  exigirPermiso('catalogo', 'gestionar')
);

productosRouter.get('/', listarProductos);
// Mantener el mismo permiso administrativo del catálogo. No habilita cobros.
productosRouter.get('/:id', consultarProducto);
productosRouter.post('/', registrarProducto);
productosRouter.patch('/:id', editarProducto);
productosRouter.delete('/:id', eliminarProducto);

// Heredar la sesión y catalogo/gestionar del router de productos.
productosRouter.use('/:productoId/variantes', variantesRouter);

// Administrar los grupos asignados al producto con la misma protección.
productosRouter.use(
  '/:productoId/modificadores',
  productosModificadoresRouter
);

export default productosRouter;
