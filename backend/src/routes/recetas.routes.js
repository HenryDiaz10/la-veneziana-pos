import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirPermiso } from '../middlewares/exigirPermiso.js';
import { registrarIngrediente, guardarRecetaCompleta, registrarDelta, listarDeltas,
  eliminarDelta, calcularReceta, listarReceta, listarInsumos } from '../controllers/recetas.controller.js';

const recetasRouter = Router();
recetasRouter.use(autenticar, exigirPermiso('catalogo', 'gestionar'));
recetasRouter.get('/insumos', listarInsumos);
recetasRouter.get('/productos/:productoId', listarReceta);
recetasRouter.post('/vincular', registrarIngrediente);
recetasRouter.put('/productos/:productoId', guardarRecetaCompleta);
recetasRouter.get('/modificadores/:modificadorId', listarDeltas);
recetasRouter.post('/modificadores/vincular', registrarDelta);
recetasRouter.delete('/modificadores/:modificadorId/insumos/:insumoId', eliminarDelta);
recetasRouter.post('/resolver', calcularReceta);
export default recetasRouter;
