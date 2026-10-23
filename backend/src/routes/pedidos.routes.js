import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';
import * as c from '../controllers/pedidos.controller.js';
const router = Router();
router.use(autenticar);
router.get('/registro', exigirPermiso('pedidos', 'crear'), c.registro);
router.get('/impresion/pendientes', exigirPermiso('ventas', 'cobrar'), c.colaImpresion);
router.get('/impresion/:uid', exigirPermiso('ventas', 'cobrar'), c.estadoImpresion);
router.post('/impresion/:uid/simulacion', exigirPermiso('ventas', 'cobrar'), c.simularImpresion);
router.post('/operaciones/:tipo/:clave/resolver', (req, res, next) => {
  if (!req.params.tipo.startsWith('pedido.')) return res.status(400).json({ mensaje: 'Operación no válida.' });
  return exigirPermiso(req.params.tipo === 'pedido.crear' ? 'pedidos' : 'ventas', req.params.tipo === 'pedido.crear' ? 'crear' : 'cobrar')(req, res, next);
}, c.resolver);
router.get('/operaciones/:tipo/:clave', (req, res, next) => {
  if (!req.params.tipo.startsWith('pedido.')) return res.status(400).json({ mensaje: 'Tipo de operación de pedido no válido.' });
  const crear = ['pedido.crear', 'pedido.ampliar'].includes(req.params.tipo);
  return exigirPermiso(crear ? 'pedidos' : 'ventas', crear ? 'crear' : 'cobrar')(req, res, next);
}, c.recuperar);
router.post('/', exigirPermiso('pedidos', 'crear'), c.crear);
router.post('/:id/lineas', exigirPermiso('pedidos', 'crear'), c.ampliar);
router.get('/:id/contexto-pago', exigirPermiso('ventas', 'cobrar'), c.contextoPago);
// Meseros y cajeros pueden consultar lo necesario para su flujo operativo.
router.get('/:id', (req, res, next) => req.auth.usuario.permisos.some(p =>
  (p.modulo === 'pedidos' && p.accion === 'crear') || (p.modulo === 'ventas' && p.accion === 'cobrar'))
  ? next() : res.status(403).json({ mensaje: 'No tienes permiso para consultar pedidos.' }), c.consultar);
router.post('/:id/bloqueo-pago', exigirPermiso('ventas', 'cobrar'), c.bloquear);
router.post('/:id/liberar-pago', exigirPermiso('ventas', 'cobrar'), c.liberar);
router.post('/:id/cobro', exigirPermiso('ventas', 'cobrar'), c.cobrar);
export default router;
