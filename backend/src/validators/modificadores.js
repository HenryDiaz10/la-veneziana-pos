import { normalizarPrecio } from './productos.js';

// Comprobar que el cuerpo sea un objeto con campos permitidos.
function tieneCamposValidos(datos, permitidos) {
  return (
    datos !== null &&
    typeof datos === 'object' &&
    !Array.isArray(datos) &&
    Object.keys(datos).length > 0 &&
    Object.keys(datos).every(campo => permitidos.includes(campo))
  );
}

function normalizarNombre(valor) {
  if (typeof valor !== 'string') {
    return null;
  }

  const nombre = valor.trim();

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

  return nombre;
}

// Validar el grupo: Extras, Bordes, Exclusiones, etc.
export function validarGrupoModificador(
  datos,
  { parcial = false } = {}
) {
  const permitidos = [
    'nombre_grupo',
    'es_multiple',
    'es_obligatorio'
  ];

  if (!tieneCamposValidos(datos, permitidos)) {
    return null;
  }

  if (!parcial && !Object.hasOwn(datos, 'nombre_grupo')) {
    return null;
  }

  const resultado = {};

  if (Object.hasOwn(datos, 'nombre_grupo')) {
    const nombre = normalizarNombre(datos.nombre_grupo);

    if (nombre === null) {
      return null;
    }

    resultado.nombre_grupo = nombre;
  }

  for (const campo of ['es_multiple', 'es_obligatorio']) {
    if (Object.hasOwn(datos, campo)) {
      if (typeof datos[campo] !== 'boolean') {
        return null;
      }

      resultado[campo] = datos[campo];
    }
  }

  return resultado;
}

// Validar una opción concreta del grupo.
// El grupo propietario procederá de la ruta, no del cuerpo.
export function validarItemModificador(
  datos,
  { parcial = false } = {}
) {
  const permitidos = [
    'nombre_modificador',
    'precio_adicional',
    'es_exclusion'
  ];

  if (!tieneCamposValidos(datos, permitidos)) {
    return null;
  }

  if (!parcial && !Object.hasOwn(datos, 'nombre_modificador')) {
    return null;
  }

  const resultado = {};

  if (Object.hasOwn(datos, 'nombre_modificador')) {
    const nombre = normalizarNombre(datos.nombre_modificador);

    if (nombre === null) {
      return null;
    }

    resultado.nombre_modificador = nombre;
  }

  if (Object.hasOwn(datos, 'precio_adicional')) {
    const precio = normalizarPrecio(datos.precio_adicional);

    if (precio === null) {
      return null;
    }

    resultado.precio_adicional = precio;
  }

  if (Object.hasOwn(datos, 'es_exclusion')) {
    if (typeof datos.es_exclusion !== 'boolean') {
      return null;
    }

    resultado.es_exclusion = datos.es_exclusion;
  }

  return resultado;
}