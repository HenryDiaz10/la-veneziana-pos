import { manejarComercial } from './pedidos.controller.js';
import { exigirPedido as exigir } from '../services/pedidos-calculo.js';
import { consultarResumenCaja, registrarMovimientoCaja, cerrarCaja, copiarCierre } from '../services/caja-cierre.service.js';
import * as impresion from '../services/impresion.service.js';
import { consultarDevoluciones, previsualizarDevolucion, registrarDevolucion } from '../services/devoluciones.service.js';
import { recuperarOperacion, resolverIntento } from '../services/operacion-comercial.js';

const contexto = req => ({ usuarioId: req.auth.usuario.id, clave: req.get('Idempotency-Key') });
const sesionId = req => { const n = Number(req.params.id); exigir(/^[1-9]\d{0,9}$/.test(req.params.id)); return n; };
export const resumen = manejarComercial(req => consultarResumenCaja(sesionId(req), contexto(req)));
export const movimiento = manejarComercial(req => registrarMovimientoCaja(sesionId(req), req.body, contexto(req)), 201);
export const cerrar = manejarComercial(req => cerrarCaja(sesionId(req), req.body, contexto(req)));
export const copia = manejarComercial(req => copiarCierre(sesionId(req), req.body, contexto(req)), 201);
export const colaImpresion = manejarComercial(req => impresion.pendientesImpresion(req.auth.usuario.id, ['cierre', 'copia']));
export const estadoImpresion = manejarComercial(req => impresion.consultarImpresion(req.params.uid, req.auth.usuario.id, ['cierre', 'copia']));
export const simularImpresion = manejarComercial(req => impresion.registrarSimulacion(req.params.uid, req.body, contexto(req), ['cierre', 'copia']));
export const historialDevoluciones = manejarComercial(req => consultarDevoluciones(req.params.id));
export const propuestaDevolucion = manejarComercial(req => previsualizarDevolucion(req.params.id, req.body));
export const devolver = manejarComercial(req => registrarDevolucion(req.params.id, req.body, contexto(req)), 201);
function tipo(req) {
  const permitido = req.baseUrl.endsWith('/ventas') ? ['venta.devolver'] : ['caja.abrir', 'caja.movimiento', 'caja.cerrar', 'caja.copia'];
  exigir(permitido.includes(req.params.tipo));
  return req.params.tipo;
}
export const recuperar = manejarComercial(req => recuperarOperacion(req.auth.usuario.id, tipo(req), req.params.clave));
export const resolver = manejarComercial(req => {
  exigir(Object.keys(req.body ?? {}).length === 0);
  return resolverIntento(req.auth.usuario.id, tipo(req), req.params.clave);
});
