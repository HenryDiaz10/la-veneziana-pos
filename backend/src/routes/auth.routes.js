import { Router } from 'express';

import {
  login,
  sesionActual,
  logout
} from '../controllers/auth.controller.js';

import { limitarLogin } from '../middlewares/loginLimiter.js';
import { autenticar } from '../middlewares/autenticar.js';

const authRouter = Router();

// Limitar los intentos de inicio de sesión.
authRouter.post('/login', limitarLogin, login);

// Consultar la identidad y los permisos de la sesión vigente.
authRouter.get('/session', autenticar, sesionActual);

// Revocar exclusivamente la sesión del token presentado.
authRouter.post('/logout', autenticar, logout);

export default authRouter;