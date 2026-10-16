// Validar categorías antes de enviarlas al servicio.
// Devuelve datos normalizados o null cuando hay una entrada inválida.
export function validarCategoria(datos, { parcial = false } = {}) {
  if (
    datos === null ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    return null;
  }

  const camposPermitidos = new Set([
    'nombre',
    'slug',
    'color_hex',
    'orden_visual',
    'icono_url',
    'es_para_kds',
    'activa'
  ]);

  const campos = Object.keys(datos);

  // Rechazar campos desconocidos y actualizaciones vacías.
  if (
    campos.length === 0 ||
    campos.some(campo => !camposPermitidos.has(campo))
  ) {
    return null;
  }

  const resultado = {};

  // En el alta son obligatorios; en una actualización pueden omitirse.
  for (const campo of ['nombre', 'slug']) {
    if (!Object.hasOwn(datos, campo)) {
      if (!parcial) {
        return null;
      }

      continue;
    }

    if (typeof datos[campo] !== 'string') {
      return null;
    }

    const valor = datos[campo].trim();

    if (
      valor.length === 0 ||
      [...valor].length > 100 ||
      [...valor].some(caracter => {
        const codigo = caracter.codePointAt(0);
        return codigo <= 31 || (codigo >= 127 && codigo <= 159);
      })
    ) {
      return null;
    }

    // Identificador legible: pizzas, bebidas-frias, etc.
    if (
      campo === 'slug' &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valor)
    ) {
      return null;
    }

    resultado[campo] = valor;
  }

  if (Object.hasOwn(datos, 'color_hex')) {
    if (
      typeof datos.color_hex !== 'string' ||
      !/^#[0-9a-fA-F]{6}$/.test(datos.color_hex)
    ) {
      return null;
    }

    resultado.color_hex = datos.color_hex.toUpperCase();
  }

  if (Object.hasOwn(datos, 'orden_visual')) {
    if (
      !Number.isSafeInteger(datos.orden_visual) ||
      datos.orden_visual < 0 ||
      datos.orden_visual > 2147483647
    ) {
      return null;
    }

    resultado.orden_visual = datos.orden_visual;
  }

  // Aceptar booleanos reales, no textos como "false".
  for (const campo of ['es_para_kds', 'activa']) {
    if (Object.hasOwn(datos, campo)) {
      if (typeof datos[campo] !== 'boolean') {
        return null;
      }

      resultado[campo] = datos[campo];
    }
  }

  if (Object.hasOwn(datos, 'icono_url')) {
    // null permite retirar una imagen anteriormente asignada.
    if (datos.icono_url === null) {
      resultado.icono_url = null;
    } else {
      if (typeof datos.icono_url !== 'string') {
        return null;
      }

      const valor = datos.icono_url.trim();

      if (
        valor.length === 0 ||
        valor.length > 255 ||
        [...valor].some(caracter => caracter.codePointAt(0) <= 32)
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

      // Guardar la dirección no implica descargarla desde el servidor.
      resultado.icono_url = valor;
    }
  }

  return resultado;
}