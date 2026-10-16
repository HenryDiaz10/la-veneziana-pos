// Cantidades y costos en unidad base, escalados a cuatro decimales.
// No usar Number para saldos, costos ni productos intermedios.
export const MAX_SALDO = 999999999999n; // DECIMAL(12,4)
export const MAX_COSTO_TOTAL = 99999999999999n; // DECIMAL(14,4)
export class ErrorInventario extends Error {
  constructor(codigo, detalle = undefined) {
    super(codigo);
    this.name = 'ErrorInventario';
    this.codigo = codigo;
    this.detalle = detalle;
  }
}
export function exigirInventario(condicion, codigo, detalle) {
  if (!condicion) throw new ErrorInventario(codigo, detalle);
}
export function decimalInventario(valor, { positivo = false, maximo = MAX_SALDO } = {}) {
  exigirInventario(['string', 'number'].includes(typeof valor), 'DATOS_INVALIDOS');
  const texto = String(valor);
  exigirInventario(/^\d{1,10}(?:\.\d{1,4})?$/.test(texto), 'DATOS_INVALIDOS');
  const [entero, fraccion = ''] = texto.split('.');
  const escalado = BigInt(entero) * 10000n + BigInt(fraccion.padEnd(4, '0'));
  exigirInventario(escalado <= maximo && (!positivo || escalado > 0n), 'CANTIDAD_FUERA_RANGO');
  return escalado;
}
export const formatoInventario = valor => `${valor / 10000n}.${String(valor % 10000n).padStart(4, '0')}`;
export const redondearInventario = (n, d) => n / d + (n % d * 2n >= d ? 1n : 0n);
export function promedioIngreso(fisico, promedio, cantidad, costo) {
  const nuevoFisico = fisico + cantidad;
  exigirInventario(cantidad > 0n && nuevoFisico <= MAX_SALDO, 'CANTIDAD_FUERA_RANGO');
  return redondearInventario(fisico * promedio + cantidad * costo, nuevoFisico);
}
export function costoTotalConsumo(cantidad, costo) {
  const total = redondearInventario(cantidad * costo, 10000n);
  exigirInventario(total <= MAX_COSTO_TOTAL, 'COSTO_FUERA_RANGO');
  return total;
}
export function comprobarSaldos(fisico, reservado) {
  exigirInventario(fisico >= 0n && fisico <= MAX_SALDO && reservado >= 0n && reservado <= fisico, 'SALDOS_INCONSISTENTES');
}
export const idInsumoValido = valor => Number.isSafeInteger(valor) && valor > 0 && valor <= 2147483647;
export function idTareaInventario(valor) {
  const texto = typeof valor === 'number' && Number.isSafeInteger(valor) ? String(valor) : valor;
  exigirInventario(typeof texto === 'string' && /^[1-9]\d{0,18}$/.test(texto) && BigInt(texto) <= 9223372036854775807n, 'DATOS_INVALIDOS');
  return texto;
}

// Leer únicamente el snapshot persistido por el servidor, nunca la receta viva
// ni una lista de ingredientes proporcionada por el comando del cliente.
export function ingredientesTarea(tarea) {
  const s = tarea.snapshot_json;
  exigirInventario(s && s.version === 1 && s.producto_venta_id === tarea.producto_id &&
    (s.variante_id ?? null) === (tarea.variante_id ?? null) && s.cantidad === tarea.cantidad &&
    Number.isSafeInteger(s.cantidad) && s.cantidad > 0 &&
    Array.isArray(s.ingredientes) && s.ingredientes.length > 0 && s.ingredientes.length <= 5100, 'SNAPSHOT_INVALIDO');
  const vistos = new Set();
  return s.ingredientes.map(i => {
    exigirInventario(i && idInsumoValido(i.insumo_id) && idInsumoValido(i.unidad_medida_id) &&
      typeof i.unidad === 'string' && ['kg', 'l', 'un'].includes(i.unidad.toLowerCase()) && !vistos.has(i.insumo_id), 'SNAPSHOT_INVALIDO');
    vistos.add(i.insumo_id);
    let cantidad, unitaria;
    try {
      cantidad = decimalInventario(i.cantidad_bruta_total, { positivo: true });
      unitaria = decimalInventario(i.cantidad_bruta_unitaria, { positivo: true });
    } catch { throw new ErrorInventario('SNAPSHOT_INVALIDO'); }
    exigirInventario(unitaria * BigInt(s.cantidad) === cantidad, 'SNAPSHOT_INVALIDO');
    return { insumo_id: i.insumo_id, unidad_medida_id: i.unidad_medida_id, unidad: i.unidad.toLowerCase(), cantidad };
  }).sort((a, b) => a.insumo_id - b.insumo_id);
}
