import {
  InsumoAlmacen,
  CompraFactura,
  VentaComprobante,
  SesionCajaZ
} from '../models/index.js';

// Vigencia inicial de una autorización: cinco minutos.
export const VIGENCIA_AUTORIZACION_MS = 5 * 60 * 1000;

// Catálogo interno de acciones autorizables.
// El cliente no puede elegir modelos ni permisos arbitrarios.
const POLITICAS = Object.freeze([
  Object.freeze({ accion: 'caja/egreso', entidad: 'sesiones_caja_z', modelo: SesionCajaZ,
    moduloPermiso: 'caja', accionPermiso: 'gestionar' }),
  // Autorización adicional y explícita si la reversión genera deuda de puntos.
  Object.freeze({ accion: 'ventas/devolver_sin_saldo', entidad: 'ventas_comprobantes', modelo: VentaComprobante,
    moduloPermiso: 'ventas', accionPermiso: 'devolver' }),
  Object.freeze({ accion: 'compras/compensar', entidad: 'compras_facturas', modelo: CompraFactura,
    moduloPermiso: 'inventario', accionPermiso: 'gestionar' }),
  Object.freeze({
    accion: 'inventario/ajustar',
    entidad: 'insumos_almacen',
    modelo: InsumoAlmacen,
    moduloPermiso: 'inventario',
    accionPermiso: 'gestionar'
  }),

  Object.freeze({
    accion: 'ventas/devolver',
    entidad: 'ventas_comprobantes',
    modelo: VentaComprobante,
    moduloPermiso: 'ventas',
    accionPermiso: 'devolver'
  })
]);

// Exigir una coincidencia exacta entre acción y entidad.
export function obtenerPoliticaAutorizacion(accion, entidad) {
  return POLITICAS.find(politica =>
    politica.accion === accion &&
    politica.entidad === entidad
  ) ?? null;
}
