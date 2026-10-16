import { vincularIngrediente, reemplazarReceta, consultarReceta, vincularDelta,
  consultarDeltas, retirarDelta, resolverReceta, consultarInsumosReceta } from '../services/recetas.service.js';

const ERRORES = {
  datos_invalidos: [400, 'Datos de receta inválidos. Revisa identificadores, cantidades y campos permitidos.'],
  producto_inexistente: [404, 'El producto no existe.'],
  variante_inexistente: [404, 'La variante no pertenece al producto indicado.'],
  insumo_inexistente: [404, 'Uno de los insumos no existe.'],
  modificador_inexistente: [404, 'El modificador no existe.'],
  producto_no_preparado: [409, 'Las recetas corresponden a platos preparados. Productos directos y combos usan su propia composición.'],
  producto_inactivo: [409, 'El producto o su categoría no están activos.'],
  insumo_inactivo: [409, 'La receta contiene un insumo inactivo.'],
  unidad_incompatible: [400, 'La unidad no es compatible con la unidad base del insumo (kg, L o un).'],
  cantidad_fuera_rango: [400, 'La cantidad debe ser distinta de cero y caber en DECIMAL(12,4), después de convertir y redondear.'],
  demasiados_ingredientes: [400, 'Se permiten hasta 100 insumos por receta o modificador.'],
  signo_delta_invalido: [400, 'Un extra debe añadir cantidad y una exclusión debe retirarla.'],
  modificador_no_asignado: [400, 'Hay modificadores que no están asignados al producto.'],
  modificador_obligatorio: [400, 'Selecciona una opción en cada grupo obligatorio.'],
  seleccion_multiple_invalida: [400, 'Un grupo de selección única no admite varias opciones.'],
  receta_inexistente: [409, 'El producto no tiene una receta utilizable.'],
  consumo_negativo: [409, 'Los modificadores dejan una cantidad negativa de un insumo.'],
  receta_vacia: [409, 'La receta final debe contener al menos un insumo con cantidad positiva.']
};

function entero(valor, maximo = 2147483647) {
  if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)) return null;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero <= maximo ? numero : null;
}

async function responder(res, next, operacion) {
  try {
    const resultado = await operacion();
    if (Object.hasOwn(ERRORES, resultado.estado)) {
      const [codigo, mensaje] = ERRORES[resultado.estado];
      return res.status(codigo).json({ mensaje });
    }
    if (resultado.estado === 'retirado') return res.status(204).end();
    if (!['creado', 'actualizado', 'consultado'].includes(resultado.estado)) throw new Error('Resultado inesperado de recetas.');
    const { estado, ...datos } = resultado;
    return res.status(estado === 'creado' ? 201 : 200).json(datos);
  } catch (error) { return next(error); }
}

export const registrarIngrediente = (req, res, next) => responder(res, next, () => vincularIngrediente(req.body));
export const guardarRecetaCompleta = (req, res, next) => responder(res, next, () => reemplazarReceta(entero(req.params.productoId), req.body));
export const registrarDelta = (req, res, next) => responder(res, next, () => vincularDelta(req.body));
export const listarDeltas = (req, res, next) => responder(res, next, () => consultarDeltas(entero(req.params.modificadorId)));
export const eliminarDelta = (req, res, next) => responder(res, next, () => retirarDelta(entero(req.params.modificadorId), entero(req.params.insumoId)));
export const calcularReceta = (req, res, next) => responder(res, next, () => resolverReceta(req.body));

export function listarReceta(req, res, next) {
  if (Object.keys(req.query).some(c => c !== 'variante_id') || (req.query.variante_id !== undefined && entero(req.query.variante_id) === null)) {
    return res.status(400).json({ mensaje: 'Indica únicamente una variante válida o no envíes filtros para consultar la receta base.' });
  }
  return responder(res, next, () => consultarReceta(entero(req.params.productoId), req.query.variante_id === undefined ? null : entero(req.query.variante_id)));
}

export function listarInsumos(req, res, next) {
  if (Object.keys(req.query).some(c => !['pagina', 'limite', 'busqueda'].includes(c))) {
    return res.status(400).json({ mensaje: 'Filtros de insumos no válidos.' });
  }
  return responder(res, next, () => consultarInsumosReceta({ pagina: entero(req.query.pagina ?? '1', 10000),
    limite: entero(req.query.limite ?? '20', 50), busqueda: req.query.busqueda ?? '' }));
}
