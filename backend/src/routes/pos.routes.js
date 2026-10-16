import { Router } from 'express';

import {
  listarCatalogoPos,
  consultarProductoPos
} from '../controllers/pos.controller.js';

import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';

const posRouter = Router();

// Rutas operativas del punto de venta.
// Protegidas exclusivamente por sesión y el permiso operativo ventas/cobrar.
// No requieren ni otorgan el permiso administrativo catalogo/gestionar.
posRouter.use(
  autenticar,
  exigirPermiso('ventas', 'cobrar')
);

// Catálogo de venta: categorías activas y productos disponibles.
posRouter.get('/catalogo', listarCatalogoPos);

// Detalle operativo de producto: variantes y modificadores para venta y rehidratación.
posRouter.get('/productos/:id', consultarProductoPos);

export default posRouter;
