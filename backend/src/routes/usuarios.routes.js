import { Router } from 'express';

import {
  listarUsuarios,
  registrarUsuario,
  actualizarEstadoUsuario,
  actualizarRolUsuario,
  restablecerPassword,
  revocarSesiones
} from '../controllers/usuarios.controller.js';

import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';

const usuariosRouter = Router();

// Proteger todas las rutas de gestión de empleados.
usuariosRouter.use(
  autenticar,
  exigirPermiso('seguridad', 'gestionar')
);

usuariosRouter.get('/', listarUsuarios);
usuariosRouter.post('/', registrarUsuario);
usuariosRouter.patch('/:id/estado', actualizarEstadoUsuario);
usuariosRouter.patch('/:id/rol', actualizarRolUsuario);

usuariosRouter.post(
  '/:id/restablecer-password',
  restablecerPassword
);

usuariosRouter.post(
  '/:id/revocar-sesiones',
  revocarSesiones
);

export default usuariosRouter;