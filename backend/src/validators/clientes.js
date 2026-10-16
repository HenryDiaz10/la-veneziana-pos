// Reglas de entrada de la aplicación, sin verificación externa de identidad.
export function esDocumentoClienteValido(tipo, numero) {
  if (!['DNI', 'CE', 'PASAPORTE', 'RUC'].includes(tipo)) return false;
  if (numero === null) return true;
  if (typeof numero !== 'string') return false;
  if (tipo === 'DNI') return /^\d{8}$/.test(numero);
  if (tipo === 'RUC') return /^\d{11}$/.test(numero);
  return /^[A-Z0-9]{5,20}$/.test(numero);
}

export function esTelefonoClienteValido(valor) {
  return typeof valor === 'string' && /^\+?\d{6,19}$/.test(valor);
}

export function normalizarTextoCliente(valor, maximo) {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  if (!texto || [...texto].length > maximo || [...texto].some(caracter => {
    const codigo = caracter.codePointAt(0);
    return codigo <= 31 || (codigo >= 127 && codigo <= 159);
  })) return null;
  return texto;
}

// Nunca aceptar una consulta vacía que devuelva el padrón completo.
// Exigir coincidencia exacta por un solo documento o teléfono.
export function validarBusquedaCliente(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null;
  const documento = Object.hasOwn(datos, 'documento');
  const telefono = Object.hasOwn(datos, 'telefono');
  if (documento === telefono) return null;
  if (documento) {
    if (typeof datos.documento !== 'string') return null;
    const valor = datos.documento.trim().toUpperCase();
    return /^[A-Z0-9]{5,20}$/.test(valor)
      ? { numero_documento: valor } : null;
  }
  return esTelefonoClienteValido(datos.telefono)
    ? { telefono_principal: datos.telefono } : null;
}

// Perfil básico: excluir puntos, nivel, estado y notas internas.
export function validarCliente(datos, { parcial = false } = {}) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null;
  const permitidos = ['nombres', 'apellidos', 'tipo_documento',
    'numero_documento', 'telefono_principal'];
  const campos = Object.keys(datos);
  if (!campos.length || campos.some(c => !permitidos.includes(c)) ||
      (!parcial && !Object.hasOwn(datos, 'nombres'))) return null;
  const resultado = {};
  for (const campo of ['nombres', 'apellidos']) {
    if (!Object.hasOwn(datos, campo)) continue;
    if (campo === 'apellidos' && datos[campo] === null) {
      resultado[campo] = null;
    } else {
      const texto = normalizarTextoCliente(datos[campo], 150);
      if (texto === null) return null;
      resultado[campo] = texto;
    }
  }
  if (Object.hasOwn(datos, 'tipo_documento')) {
    if (!['DNI', 'CE', 'PASAPORTE', 'RUC'].includes(datos.tipo_documento)) return null;
    resultado.tipo_documento = datos.tipo_documento;
  }
  if (Object.hasOwn(datos, 'numero_documento')) {
    if (datos.numero_documento === null) resultado.numero_documento = null;
    else {
      if (typeof datos.numero_documento !== 'string') return null;
      const numero = datos.numero_documento.trim().toUpperCase();
      if (!/^[A-Z0-9]{5,20}$/.test(numero)) return null;
      resultado.numero_documento = numero;
    }
  }
  if (Object.hasOwn(datos, 'telefono_principal')) {
    if (datos.telefono_principal !== null &&
        !esTelefonoClienteValido(datos.telefono_principal)) return null;
    resultado.telefono_principal = datos.telefono_principal;
  }
  if (!parcial && !esPerfilClienteValido(resultado)) return null;
  return resultado;
}

// Utilizar también después de combinar una actualización con el registro actual.
export function esPerfilClienteValido(datos) {
  const numero = datos.numero_documento ?? null;
  return esDocumentoClienteValido(datos.tipo_documento ?? 'DNI', numero) &&
    (numero !== null || datos.telefono_principal != null);
}
