import { decimalInventario as decimal, formatoInventario as formato, redondearInventario, ErrorInventario,
  idInsumoValido } from '../services/inventario-calculo.js';
const exigir = valor => { if (!valor) throw new ErrorInventario('DATOS_INVALIDOS'); };
export const objetoCompra = (valor, campos) => valor && typeof valor === 'object' && !Array.isArray(valor) && Object.keys(valor).every(k => campos.includes(k));
export function textoCompra(valor, max, requerido = true) {
  if (!requerido && (valor === undefined || valor === null || valor === '')) return null;
  exigir(typeof valor === 'string'); const texto = valor.trim();
  exigir(texto.length > 0 && [...texto].length <= max && !/[\u0000-\u001f\u007f-\u009f]/.test(texto)); return texto;
}
export function fechaCompra(valor) {
  exigir(typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) && valor >= '1000-01-01');
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  exigir(!Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0,10) === valor); return valor;
}
const dinero = centimos => {
  exigir(centimos <= 999999999999n);
  return `${centimos / 100n}.${String(centimos % 100n).padStart(2, '0')}`;
};
export function validarProveedor(datos) {
  exigir(objetoCompra(datos, ['razon_social','ruc','telefono_contacto','correo_contacto','dias_credito','estado']));
  const ruc = textoCompra(datos.ruc,11); exigir(/^\d{11}$/.test(ruc));
  const correo = textoCompra(datos.correo_contacto,100,false);
  exigir(!correo || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo));
  const dias = datos.dias_credito ?? 0; exigir(Number.isInteger(dias) && dias >= 0 && dias <= 3650);
  exigir(['activo','inactivo'].includes(datos.estado ?? 'activo'));
  return { razon_social: textoCompra(datos.razon_social,200), ruc, telefono_contacto: textoCompra(datos.telefono_contacto,50,false),
    correo_contacto: correo, dias_credito: dias, estado: datos.estado ?? 'activo' };
}
export function validarCompra(datos) {
  exigir(objetoCompra(datos, ['proveedor_id','numero_factura','fecha_emision','fecha_vencimiento','igv','lineas','operacion_uid','revision']));
  exigir(idInsumoValido(datos.proveedor_id));
  const numero = textoCompra(datos.numero_factura,50).toUpperCase(); exigir(/^[A-Z0-9][A-Z0-9/-]*$/.test(numero));
  const emision = fechaCompra(datos.fecha_emision), vencimiento = datos.fecha_vencimiento ? fechaCompra(datos.fecha_vencimiento) : null;
  exigir(!vencimiento || vencimiento >= emision);
  exigir(typeof datos.igv === 'string' && /^\d{1,10}(?:\.\d{1,2})?$/.test(datos.igv));
  const impuesto = decimal(datos.igv, { maximo: 99999999999900n }) / 100n;
  exigir(Array.isArray(datos.lineas) && datos.lineas.length > 0 && datos.lineas.length <= 100);
  const vistos = new Set();
  let centimos = 0n;
  const lineas = datos.lineas.map(l => {
    exigir(objetoCompra(l, ['insumo_id','cantidad_base','costo_unitario']) && idInsumoValido(l.insumo_id) && !vistos.has(l.insumo_id));
    vistos.add(l.insumo_id);
    const cantidad = decimal(l.cantidad_base, { positivo: true }), costo = decimal(l.costo_unitario);
    const subtotal = redondearInventario(cantidad * costo, 1000000n);
    centimos += subtotal;
    return { insumo_id: l.insumo_id, cantidad_base: formato(cantidad), costo_unitario: formato(costo), subtotal: dinero(subtotal) };
  }).sort((a,b) => a.insumo_id-b.insumo_id);
  return { proveedor_id: datos.proveedor_id, numero_factura: numero, fecha_emision: emision, fecha_vencimiento: vencimiento,
    subtotal: dinero(centimos), igv: dinero(impuesto), total: dinero(centimos + impuesto), lineas };
}
export function validarAltaInsumo(datos) {
  exigir(objetoCompra(datos, ['codigo','nombre','unidad','stock_minimo_alerta']));
  exigir(['kg','L','un'].includes(datos.unidad));
  return { codigo: textoCompra(datos.codigo,50).toUpperCase(), nombre: textoCompra(datos.nombre,150), unidad: datos.unidad,
    stock_minimo_alerta: formato(decimal(datos.stock_minimo_alerta ?? '0')) };
}
