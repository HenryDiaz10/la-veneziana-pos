import { Router } from 'express';

import {
  listarCatalogoPos,
  consultarProductoPos
} from '../controllers/pos.controller.js';

import { autenticar } from '../middlewares/autenticar.js';

const posRouter = Router();

// Rutas operativas del punto de venta.
// Meseros consultan la carta para tomar pedidos; cajeros para operar la venta.
// No requieren ni otorgan el permiso administrativo catalogo/gestionar.
posRouter.use(
  autenticar,
  (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    return req.auth.usuario.permisos.some(p =>
    (p.modulo === 'pedidos' && p.accion === 'crear') ||
    (p.modulo === 'ventas' && p.accion === 'cobrar'))
    ? next() : res.status(403).json({ mensaje: 'No tienes permiso para consultar la carta operativa.' });
  }
);

// Catálogo de venta: categorías activas y productos disponibles.
posRouter.get('/catalogo', listarCatalogoPos);

// Detalle operativo de producto: variantes y modificadores para venta y rehidratación.
posRouter.get('/productos/:id', consultarProductoPos);

export default posRouter;
