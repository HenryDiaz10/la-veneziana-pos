import { Router } from 'express';

import {
  listarGruposProducto,
  vincularGrupoProducto,
  desvincularGrupoProducto
} from '../controllers/productos-modificadores.controller.js';

// Heredar productoId. El router padre comprueba sesión y catalogo/gestionar.
const productosModificadoresRouter = Router({ mergeParams: true });

productosModificadoresRouter.get('/', listarGruposProducto);

// Asignar o retirar repetidamente conserva el mismo estado final.
productosModificadoresRouter.put('/:grupoId', vincularGrupoProducto);
productosModificadoresRouter.delete('/:grupoId', desvincularGrupoProducto);

export default productosModificadoresRouter;
