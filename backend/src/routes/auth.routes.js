import { Router } from 'express';
import { login } from '../controllers/auth.controller.js';
import { limitarLogin } from '../middlewares/loginLimiter.js';

const authRouter = Router();

// Aplicar el límite antes de ejecutar el controlador.
authRouter.post('/login', limitarLogin, login);

export default authRouter;