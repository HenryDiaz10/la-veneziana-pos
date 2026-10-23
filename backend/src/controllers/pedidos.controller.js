import * as pedidos from '../services/pedidos.service.js';
import { cobrarPedido, consultarContextoPago } from '../services/cobros.service.js';
import { abrirCaja, consultarCaja } from '../services/caja.service.js';
import { ErrorPedido } from '../services/pedidos-calculo.js';
import { ErrorInventario } from '../services/inventario-calculo.js';
import { recuperarOperacion } from '../services/operacion-comercial.js';

const contexto = req => ({ usuarioId: req.auth.usuario.id, clave: req.get('Idempotency-Key'),
  puedeCanjear: req.auth.usuario.permisos.some(p => p.modulo === 'clientes' && p.accion === 'gestionar') });
const inexistentes = new Set(['PEDIDO_INEXISTENTE', 'OPERACION_INEXISTENTE']);
const mensajes = {
  DATOS_INVALIDOS: 'Revisa los campos permitidos, cantidades, notas y clave de idempotencia.',
  PEDIDO_INEXISTENTE: 'El pedido no existe.', PEDIDO_DESACTUALIZADO: 'El pedido cambió. Consulta su versión actual.',
  FINANZAS_PENDIENTES: 'Configura y valida FINANZAS antes de cobrar: tasa de impuesto y precios con impuesto incluido.',
  SELECCION_INCOMPLETA: 'Elige las opciones obligatorias y una sola opción en cada grupo exclusivo.',
  RECETA_NO_DISPONIBLE: 'El producto no tiene una receta válida. Configúrala antes de confirmar el pedido.',
  STOCK_INSUFICIENTE: 'No hay insumos disponibles para confirmar todo el pedido. No se guardaron líneas parciales.',
  IDEMPOTENCIA_EN_CONFLICTO: 'Esta clave de operación ya se utilizó con otros datos.',
  PAGOS_NO_CUADRAN: 'Los importes aplicados deben cubrir exactamente el total del pedido.',
  PAGO_SIN_VERIFICAR: 'El pago digital necesita referencia y confirmación operativa.',
  SESION_CAJA_NO_DISPONIBLE: 'Necesitas una sesión de caja abierta a tu nombre.',
  CAJA_YA_ABIERTA: 'La caja o el cajero ya tienen una sesión abierta.',
  BLOQUEO_NO_DISPONIBLE: 'El bloqueo de pago no está disponible o venció. Vuelve a consultar el pedido.',
  CANJE_NO_AUTORIZADO: 'El canje necesita cliente y permiso de gestión de clientes.',
  CANJE_NO_DISPONIBLE: 'El canje requiere una equivalencia de puntos configurada y un importe exacto.',
  PUNTOS_INSUFICIENTES: 'El cliente no tiene puntos suficientes.'
};
export const manejarComercial = (operacion, status = 200) => async (req, res, next) => {
  try {
    if (Object.keys(req.query).length) throw new ErrorPedido('DATOS_INVALIDOS');
    const resultado = await operacion(req);
    res.status(resultado.repetida ? 200 : status).json(resultado);
  } catch (e) {
    if (e instanceof ErrorPedido || e instanceof ErrorInventario) {
      const codigo = e.codigo;
      return res.status(codigo === 'DATOS_INVALIDOS' ? 400 : inexistentes.has(codigo) ? 404 : 409)
        .json({ codigo, mensaje: mensajes[codigo] ?? 'La operación no puede completarse. Actualiza y revisa disponibilidad y estado.', ...(e.detalles ? { detalles: e.detalles } : {}) });
    }
    next(e);
  }
};
export const crear = manejarComercial(req => pedidos.crearPedido(req.body, contexto(req)), 201);
export const ampliar = manejarComercial(req => pedidos.ampliarPedido(req.params.id, req.body, contexto(req)));
export const consultar = manejarComercial(req => pedidos.consultarPedido(req.params.id));
export const bloquear = manejarComercial(req => pedidos.cambiarBloqueoPago(req.params.id, req.body, contexto(req)));
export const liberar = manejarComercial(req => pedidos.cambiarBloqueoPago(req.params.id, req.body, contexto(req), true));
export const cobrar = manejarComercial(req => cobrarPedido(req.params.id, req.body, contexto(req)), 201);
export const contextoPago = manejarComercial(req => consultarContextoPago(req.params.id, req.auth.usuario.id, contexto(req).puedeCanjear));
export const abrir = manejarComercial(req => abrirCaja(req.body, contexto(req)), 201);
export const cajaActual = manejarComercial(req => consultarCaja(req.auth.usuario.id));
export const recuperar = manejarComercial(req => recuperarOperacion(req.auth.usuario.id, req.params.tipo ?? 'caja.abrir', req.params.clave));
