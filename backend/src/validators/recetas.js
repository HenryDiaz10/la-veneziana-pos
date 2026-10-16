export const esIdRecetaValido = id => Number.isSafeInteger(id) && id > 0 && id <= 2147483647;
const esObjeto = valor => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const camposValidos = (datos, campos) => esObjeto(datos) && Object.keys(datos).every(c => campos.includes(c));
const varianteValida = id => id === null || esIdRecetaValido(id);

// Leer decimales sin aritmética binaria ni notación científica.
export function leerDecimalExacto(valor, { negativo = false, decimales = 8 } = {}) {
  if (!['string', 'number'].includes(typeof valor)) return null;
  const texto = String(valor);
  if (!new RegExp(`^${negativo ? '-?' : ''}\\d{1,12}(?:\\.\\d{1,${decimales}})?$`).test(texto)) return null;
  const [entero, fraccion = ''] = texto.replace('-', '').split('.');
  return { numerador: BigInt(entero + fraccion) * (texto.startsWith('-') ? -1n : 1n), denominador: 10n ** BigInt(fraccion.length) };
}

export function normalizarMerma(valor = '0.00') {
  const decimal = leerDecimalExacto(valor, { decimales: 2 });
  if (!decimal) return null;
  const centesimas = decimal.numerador * 100n / decimal.denominador;
  if (centesimas < 0n || centesimas >= 10000n) return null;
  return `${centesimas / 100n}.${String(centesimas % 100n).padStart(2, '0')}`;
}

export function validarIngrediente(datos) {
  if (!camposValidos(datos, ['insumo_id', 'cantidad_bruta_necesaria', 'porcentaje_merma_esperado', 'unidad']) ||
      !esIdRecetaValido(datos.insumo_id)) return null;
  const cantidad = leerDecimalExacto(datos.cantidad_bruta_necesaria);
  const merma = normalizarMerma(datos.porcentaje_merma_esperado);
  if (!cantidad || cantidad.numerador <= 0n || merma === null || !unidadValida(datos.unidad)) return null;
  return { insumo_id: datos.insumo_id, cantidad_bruta_necesaria: datos.cantidad_bruta_necesaria,
    porcentaje_merma_esperado: merma, unidad: datos.unidad };
}

function unidadValida(unidad) {
  return unidad === undefined || (typeof unidad === 'string' && ['kg', 'g', 'l', 'ml', 'un'].includes(unidad.toLowerCase()));
}

export function validarVinculoReceta(datos) {
  if (!camposValidos(datos, ['producto_venta_id', 'variante_id', 'insumo_id', 'cantidad_bruta_necesaria', 'porcentaje_merma_esperado', 'unidad']) ||
      !esIdRecetaValido(datos.producto_venta_id) || !varianteValida(datos.variante_id ?? null)) return null;
  const { producto_venta_id, variante_id, ...ingrediente } = datos;
  const entrada = validarIngrediente(ingrediente);
  return entrada ? { producto_venta_id, variante_id: variante_id ?? null, ingrediente: entrada } : null;
}

export function validarRecetaCompleta(datos) {
  if (!camposValidos(datos, ['variante_id', 'ingredientes']) || !varianteValida(datos.variante_id ?? null) ||
      !Array.isArray(datos.ingredientes) || datos.ingredientes.length < 1 || datos.ingredientes.length > 100) return null;
  const ingredientes = datos.ingredientes.map(validarIngrediente);
  if (ingredientes.some(i => !i) || new Set(ingredientes.map(i => i.insumo_id)).size !== ingredientes.length) return null;
  return { variante_id: datos.variante_id ?? null, ingredientes };
}

export function validarDeltaReceta(datos) {
  if (!camposValidos(datos, ['modificador_id', 'insumo_id', 'delta_cantidad_base', 'unidad']) ||
      !esIdRecetaValido(datos.modificador_id) || !esIdRecetaValido(datos.insumo_id) || !unidadValida(datos.unidad)) return null;
  const delta = leerDecimalExacto(datos.delta_cantidad_base, { negativo: true });
  return delta && delta.numerador !== 0n ? { ...datos } : null;
}

export function validarResolucionReceta(datos) {
  if (!camposValidos(datos, ['producto_venta_id', 'variante_id', 'cantidad', 'modificadores']) ||
      !esIdRecetaValido(datos.producto_venta_id) || !varianteValida(datos.variante_id ?? null)) return null;
  const cantidad = datos.cantidad ?? 1;
  const modificadores = datos.modificadores ?? [];
  if (!Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > 10000 || !Array.isArray(modificadores) ||
      modificadores.length > 50 || modificadores.some(id => !esIdRecetaValido(id)) || new Set(modificadores).size !== modificadores.length) return null;
  return { producto_venta_id: datos.producto_venta_id, variante_id: datos.variante_id ?? null, cantidad, modificadores };
}
