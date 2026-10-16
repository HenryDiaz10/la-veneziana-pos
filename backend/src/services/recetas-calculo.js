import { leerDecimalExacto } from '../validators/recetas.js';

const UNIDADES = Object.freeze({
  kg: { dimension: 'masa', factor: 1000n }, g: { dimension: 'masa', factor: 1n },
  l: { dimension: 'volumen', factor: 1000n }, ml: { dimension: 'volumen', factor: 1n },
  un: { dimension: 'unidades', factor: 1n }
});
export const MAX_CANTIDAD_ESCALADA = 999999999999n;
export const unidadCanonica = abreviatura => typeof abreviatura === 'string' && ['kg', 'l', 'un'].includes(abreviatura.toLowerCase()) ? abreviatura.toLowerCase() : null;
export const unidadesCompatibles = base => base === 'kg' ? ['kg', 'g'] : base === 'l' ? ['l', 'ml'] : base === 'un' ? ['un'] : [];

export function formatearCantidad(cantidad) {
  const absoluto = cantidad < 0n ? -cantidad : cantidad;
  return `${cantidad < 0n ? '-' : ''}${absoluto / 10000n}.${String(absoluto % 10000n).padStart(4, '0')}`;
}

// Cuatro decimales, mitad alejándose de cero. Convertir antes de redondear.
export function convertirCantidadBase(valor, unidadEntrada, unidadBase, { negativo = false } = {}) {
  const decimal = leerDecimalExacto(valor, { negativo });
  const origen = UNIDADES[unidadEntrada?.toLowerCase()];
  const destino = UNIDADES[unidadBase];
  if (!decimal || !origen || !destino || origen.dimension !== destino.dimension) return { error: 'unidad_incompatible' };
  const signo = decimal.numerador < 0n ? -1n : 1n;
  const numerador = (decimal.numerador < 0n ? -decimal.numerador : decimal.numerador) * origen.factor * 10000n;
  const denominador = decimal.denominador * destino.factor;
  const escalada = (numerador / denominador + (numerador % denominador * 2n >= denominador ? 1n : 0n)) * signo;
  if (escalada === 0n || escalada > MAX_CANTIDAD_ESCALADA || escalada < -MAX_CANTIDAD_ESCALADA) return { error: 'cantidad_fuera_rango' };
  return { escalada, cantidad: formatearCantidad(escalada) };
}

// Las filas de MySQL ya están cuantizadas a cuatro decimales.
export function cantidadEscalada(valor) {
  const decimal = leerDecimalExacto(valor, { negativo: true, decimales: 4 });
  if (!decimal) throw new Error('Cantidad de receta no válida en la base de datos.');
  return decimal.numerador * 10000n / decimal.denominador;
}

// Copia independiente e inmutable que podrá guardarse en kds_tareas.snapshot_json
// al crear la tarea dentro de la transacción de confirmación del pedido.
export function congelarSnapshotReceta(datos) {
  const copia = JSON.parse(JSON.stringify(datos));
  function congelar(valor) {
    if (valor && typeof valor === 'object') { Object.values(valor).forEach(congelar); Object.freeze(valor); }
    return valor;
  }
  return congelar(copia);
}
