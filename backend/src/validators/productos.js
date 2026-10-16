// Limitar la búsqueda antes de utilizarla en la consulta del catálogo.
export function normalizarBusquedaProducto(valor = '') {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  if ([...texto].length > 150 || [...texto].some(caracter => {
    const codigo = caracter.codePointAt(0);
    return codigo <= 31 || (codigo >= 127 && codigo <= 159);
  })) return null;
  return texto;
}

// Normalizar precios sin hacer cálculos con decimales binarios.
// DECIMAL(12,2) admite hasta diez cifras enteras y dos decimales.
export function normalizarPrecio(valor) {
  if (
    typeof valor !== 'string' &&
    typeof valor !== 'number'
  ) {
    return null;
  }

  if (typeof valor === 'number' && !Number.isFinite(valor)) {
    return null;
  }

  const texto = String(valor);

  if (!/^(0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(texto)) {
    return null;
  }

  const [entero, decimales = ''] = texto.split('.');

  return `${entero}.${decimales.padEnd(2, '0')}`;
}

function esIdValido(valor) {
  return (
    Number.isSafeInteger(valor) &&
    valor > 0 &&
    valor <= 2147483647
  );
}

// Validar altas y actualizaciones parciales.
// Las relaciones con categoría e insumo se comprobarán en el servicio.
export function validarProducto(datos, { parcial = false } = {}) {
  if (
    datos === null ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    return null;
  }

  const permitidos = new Set([
    'nombre',
    'categoria_id',
    'precio_venta_base',
    'sku',
    'codigo_barras',
    'descripcion',
    'imagen_url',
    'tipo_producto',
    'controla_stock',
    'puntos_recompensa',
    'estado',
    'insumo_directo_id'
  ]);

  const campos = Object.keys(datos);

  // No permitir asignar stock, costos ni márgenes desde este formulario.
  if (
    campos.length === 0 ||
    campos.some(campo => !permitidos.has(campo))
  ) {
    return null;
  }

  if (
    !parcial &&
    ['nombre', 'categoria_id', 'precio_venta_base']
      .some(campo => !Object.hasOwn(datos, campo))
  ) {
    return null;
  }

  const resultado = {};

  // Longitudes máximas de los textos aceptados.
  // La descripción se limita a 5000 caracteres como regla de la API.
  const textos = {
    nombre: 150,
    sku: 50,
    codigo_barras: 100,
    descripcion: 5000
  };

  for (const [campo, maximo] of Object.entries(textos)) {
    if (!Object.hasOwn(datos, campo)) {
      continue;
    }

    if (datos[campo] === null && campo !== 'nombre') {
      resultado[campo] = null;
      continue;
    }

    if (typeof datos[campo] !== 'string') {
      return null;
    }

    const valor = datos[campo].trim();

    if (
      valor.length === 0 ||
      [...valor].length > maximo ||
      [...valor].some(caracter => {
        const codigo = caracter.codePointAt(0);

        // Permitir saltos de línea únicamente en la descripción.
        if (campo === 'descripcion' && [10, 13].includes(codigo)) {
          return false;
        }

        return codigo <= 31 || (codigo >= 127 && codigo <= 159);
      })
    ) {
      return null;
    }

    resultado[campo] = valor;
  }

  if (Object.hasOwn(datos, 'categoria_id')) {
    if (!esIdValido(datos.categoria_id)) {
      return null;
    }

    resultado.categoria_id = datos.categoria_id;
  }

  if (Object.hasOwn(datos, 'precio_venta_base')) {
    const precio = normalizarPrecio(datos.precio_venta_base);

    if (precio === null) {
      return null;
    }

    resultado.precio_venta_base = precio;
  }

  const opciones = {
    tipo_producto: ['plato_preparado', 'producto_directo', 'combo'],
    estado: ['activo', 'inactivo', 'oculto_temporal']
  };

  for (const [campo, valores] of Object.entries(opciones)) {
    if (Object.hasOwn(datos, campo)) {
      if (!valores.includes(datos[campo])) {
        return null;
      }

      resultado[campo] = datos[campo];
    }
  }

  if (Object.hasOwn(datos, 'controla_stock')) {
    if (typeof datos.controla_stock !== 'boolean') {
      return null;
    }

    resultado.controla_stock = datos.controla_stock;
  }

  if (Object.hasOwn(datos, 'puntos_recompensa')) {
    if (
      !Number.isSafeInteger(datos.puntos_recompensa) ||
      datos.puntos_recompensa < 0 ||
      datos.puntos_recompensa > 2147483647
    ) {
      return null;
    }

    resultado.puntos_recompensa = datos.puntos_recompensa;
  }

  if (Object.hasOwn(datos, 'insumo_directo_id')) {
    if (
      datos.insumo_directo_id !== null &&
      !esIdValido(datos.insumo_directo_id)
    ) {
      return null;
    }

    resultado.insumo_directo_id = datos.insumo_directo_id;
  }

  if (Object.hasOwn(datos, 'imagen_url')) {
    if (datos.imagen_url === null) {
      resultado.imagen_url = null;
    } else {
      if (typeof datos.imagen_url !== 'string') {
        return null;
      }

      const valor = datos.imagen_url.trim();

      if (
        valor.length === 0 ||
        valor.length > 255 ||
        [...valor].some(caracter => {
          const codigo = caracter.codePointAt(0);
          return codigo <= 32 || (codigo >= 127 && codigo <= 159);
        })
      ) {
        return null;
      }

      try {
        const url = new URL(valor);

        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.username ||
          url.password
        ) {
          return null;
        }
      } catch {
        return null;
      }

      resultado.imagen_url = valor;
    }
  }

  return resultado;
}
