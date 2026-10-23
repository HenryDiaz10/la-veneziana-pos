import { consultarSalon } from '../services/salon.service.js';
import { consultarMesaSalon, cambiarMesa } from '../services/mesas.service.js';
import { manejarComercial } from './pedidos.controller.js';
import { ErrorPedido } from '../services/pedidos-calculo.js';
import { recuperarOperacion, resolverIntento } from '../services/operacion-comercial.js';

const contexto = req => ({ usuarioId: req.auth.usuario.id, clave: req.get('Idempotency-Key') });
const tipoMesa = req => {
  if (!['mesa.ocupar', 'mesa.liberar', 'mesa.limpiar'].includes(req.params.tipo)) throw new ErrorPedido('DATOS_INVALIDOS');
  return req.params.tipo;
};
export const mapa = manejarComercial(() => consultarSalon());
export const detalle = manejarComercial(req => consultarMesaSalon(req.params.id));
export const cambiar = accion => manejarComercial(req => cambiarMesa(req.params.id, accion, req.body, contexto(req)));
export const recuperar = manejarComercial(req => recuperarOperacion(req.auth.usuario.id, tipoMesa(req), req.params.clave));
export const resolver = manejarComercial(req => {
  if (Object.keys(req.body ?? {}).length) throw new ErrorPedido('DATOS_INVALIDOS');
  return resolverIntento(req.auth.usuario.id, tipoMesa(req), req.params.clave);
});
