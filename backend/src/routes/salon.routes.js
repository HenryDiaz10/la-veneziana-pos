import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';
import * as c from '../controllers/salon.controller.js';
import {manejarComercial} from '../controllers/pedidos.controller.js';
import {guardarZona,eliminarZona,guardarMesaConfiguracion} from '../services/salon-configuracion.js';

const router = Router();
router.use(autenticar, exigirPermiso('mesas', 'gestionar'));
// La lectura continúa sin efectos; los comandos exigen revisión e idempotencia.
router.get('/', c.mapa);
const contexto=req=>({usuarioId:req.auth.usuario.id,clave:req.get('Idempotency-Key')});
const configurar=exigirPermiso('configuracion','gestionar');
router.post('/zonas',configurar,manejarComercial(req=>guardarZona(null,req.body,contexto(req)),201));
router.patch('/zonas/:id',configurar,manejarComercial(req=>guardarZona(req.params.id,req.body,contexto(req))));
router.delete('/zonas/:id',configurar,manejarComercial(req=>eliminarZona(req.params.id,req.body,contexto(req))));
router.post('/mesas',configurar,manejarComercial(req=>guardarMesaConfiguracion(null,req.body,contexto(req)),201));
router.patch('/mesas/:id',configurar,manejarComercial(req=>guardarMesaConfiguracion(req.params.id,req.body,contexto(req))));
router.get('/mesas/:id', c.detalle);
router.get('/operaciones/:tipo/:clave', c.recuperar);
router.post('/operaciones/:tipo/:clave/resolver', c.resolver);
for (const accion of ['ocupar', 'liberar', 'limpiar']) router.post(`/mesas/:id/${accion}`, c.cambiar(accion));
export default router;
