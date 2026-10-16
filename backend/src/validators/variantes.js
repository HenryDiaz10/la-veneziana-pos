import { normalizarPrecio } from './productos.js';

// Validar variantes sin permitir modificar el producto propietario
// ni asignar costos calculados desde el formulario.
export function validarVariante(datos, { parcial = false } = {}) {
  if (
    datos === null ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    return null;
  }

  const permitidos = new Set([
    'nombre_variante',
    'precio_adicional'
  ]);

  const campos = Object.keys(datos);

  if (
    campos.length === 0 ||
    campos.some(campo => !permitidos.has(campo))
  ) {
    return null;
  }

  // En el alta es obligatorio indicar el nombre.
  if (!parcial && !Object.hasOwn(datos, 'nombre_variante')) {
    return null;
  }

  const resultado = {};

  if (Object.hasOwn(datos, 'nombre_variante')) {
    if (typeof datos.nombre_variante !== 'string') {
      return null;
    }

    const nombre = datos.nombre_variante.trim();

    if (
      nombre.length === 0 ||
      [...nombre].length > 100 ||
      [...nombre].some(caracter => {
        const codigo = caracter.codePointAt(0);
        return codigo <= 31 || (codigo >= 127 && codigo <= 159);
      })
    ) {
      return null;
    }

    resultado.nombre_variante = nombre;
  }

  if (Object.hasOwn(datos, 'precio_adicional')) {
    const precio = normalizarPrecio(datos.precio_adicional);

    if (precio === null) {
      return null;
    }

    resultado.precio_adicional = precio;
  }

  return resultado;
}