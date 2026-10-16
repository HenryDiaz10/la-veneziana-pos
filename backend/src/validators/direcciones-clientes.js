import { normalizarTextoCliente } from './clientes.js';

export function validarDireccionCliente(datos, { parcial = false } = {}) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null;
  const permitidos = ['alias', 'direccion_completa', 'referencia',
    'coordenadas_gps', 'es_predeterminada'];
  const campos = Object.keys(datos);
  if (!campos.length || campos.some(c => !permitidos.includes(c)) ||
      (!parcial && !Object.hasOwn(datos, 'direccion_completa'))) return null;
  const resultado = {};
  for (const [campo, maximo] of Object.entries({
    alias: 50, direccion_completa: 255, referencia: 255
  })) {
    if (!Object.hasOwn(datos, campo)) continue;
    if (datos[campo] === null && campo !== 'direccion_completa') {
      resultado[campo] = null;
    } else {
      const texto = normalizarTextoCliente(datos[campo], maximo);
      if (texto === null) return null;
      resultado[campo] = texto;
    }
  }
  if (Object.hasOwn(datos, 'es_predeterminada')) {
    if (typeof datos.es_predeterminada !== 'boolean') return null;
    resultado.es_predeterminada = datos.es_predeterminada;
  }
  if (Object.hasOwn(datos, 'coordenadas_gps')) {
    const valor = datos.coordenadas_gps;
    if (valor === null) resultado.coordenadas_gps = null;
    else {
      if (typeof valor !== 'string' || valor.length > 100 ||
          !/^-?\d{1,3}(?:\.\d{1,8})?,-?\d{1,3}(?:\.\d{1,8})?$/.test(valor)) return null;
      const [latitud, longitud] = valor.split(',').map(Number);
      if (Math.abs(latitud) > 90 || Math.abs(longitud) > 180) return null;
      resultado.coordenadas_gps = valor;
    }
  }
  return resultado;
}
