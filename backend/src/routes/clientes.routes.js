import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';
import {
  listarClientes, consultarPerfilCliente, registrarCliente, editarCliente,
  listarDireccionesCliente, registrarDireccionCliente, editarDireccionCliente, listarPuntosCliente
} from '../controllers/clientes.controller.js';

const clientesRouter = Router();
clientesRouter.use(autenticar);
// Limitar intentos de consulta del padrón sin registrar los datos buscados.
clientesRouter.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { mensaje: 'Demasiadas solicitudes de clientes. Inténtalo más tarde.' }
}));

const buscar = exigirPermiso('clientes', 'buscar');
const gestionar = exigirPermiso('clientes', 'gestionar');

// El permiso de búsqueda no concede escritura sobre datos personales.
clientesRouter.get('/', buscar, listarClientes);
clientesRouter.get('/:clienteId', buscar, consultarPerfilCliente);
clientesRouter.get('/:clienteId/direcciones', buscar, listarDireccionesCliente);
// El historial administrativo requiere gestionar, además del filtro exacto.
clientesRouter.get('/:clienteId/puntos', gestionar, listarPuntosCliente);
clientesRouter.post('/', gestionar, registrarCliente);
clientesRouter.patch('/:clienteId', gestionar, editarCliente);
clientesRouter.post('/:clienteId/direcciones', gestionar, registrarDireccionCliente);
clientesRouter.patch('/:clienteId/direcciones/:direccionId', gestionar, editarDireccionCliente);

export default clientesRouter;
