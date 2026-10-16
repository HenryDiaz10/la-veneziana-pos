import {
  buscarClientes, obtenerPerfilCliente, crearCliente, actualizarCliente, obtenerPuntosCliente
} from '../services/clientes.service.js';
import {
  obtenerDireccionesCliente, crearDireccionCliente, actualizarDireccionCliente
} from '../services/direcciones-clientes.service.js';
import { validarBusquedaCliente } from '../validators/clientes.js';

function leerEntero(valor, maximo) {
  if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)) return null;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero <= maximo ? numero : null;
}

// Un filtro obligatorio, sin comodines ni consulta general del padrón.
function leerConsulta(query) {
  if (Object.keys(query).some(c => !['documento', 'telefono', 'pagina', 'limite'].includes(c))) return null;
  const filtro = validarBusquedaCliente(query);
  const pagina = leerEntero(query.pagina ?? '1', 10000);
  const limite = leerEntero(query.limite ?? '10', 20);
  if (!filtro || pagina === null || limite === null) return null;
  return { busqueda: query, pagina, limite };
}

const ERRORES = {
  datos_invalidos: [400, 'Datos inválidos. Revisa campos, documento, teléfono o paginación.'],
  cliente_inexistente: [404, 'No se encontró un cliente que coincida con los datos indicados.'],
  direccion_inexistente: [404, 'La dirección no existe en el cliente indicado.'],
  documento_duplicado: [409, 'Ya existe un cliente con ese documento.']
};

// Unificar la traducción de resultados para las operaciones del CRM.
async function responderOperacion(res, next, operacion, esperado, campo, codigo = 200) {
  try {
    const resultado = await operacion();
    if (Object.hasOwn(ERRORES, resultado.estado)) {
      const [estado, mensaje] = ERRORES[resultado.estado];
      return res.status(estado).json({ mensaje });
    }
    if (resultado.estado !== esperado) throw new Error('Resultado inesperado en clientes.');
    return res.status(codigo).json({
      [campo]: resultado[campo],
      ...(resultado.paginacion ? { paginacion: resultado.paginacion } : {})
    });
  } catch (error) {
    return next(error);
  }
}

function responderConsultaInvalida(res) {
  return res.status(400).json({
    mensaje: 'Indica un documento o teléfono exacto. Página máxima: 10000; límite máximo: 20.'
  });
}

export function listarClientes(req, res, next) {
  const consulta = leerConsulta(req.query);
  if (!consulta) return responderConsultaInvalida(res);
  return responderOperacion(res, next, () => buscarClientes(consulta), 'consultado', 'clientes');
}

export function consultarPerfilCliente(req, res, next) {
  const consulta = leerConsulta(req.query);
  if (!consulta) return responderConsultaInvalida(res);
  const clienteId = leerEntero(req.params.clienteId, 2147483647);
  return responderOperacion(res, next,
    () => obtenerPerfilCliente({ clienteId, ...consulta }), 'consultado', 'cliente');
}

export function registrarCliente(req, res, next) {
  return responderOperacion(res, next, () => crearCliente(req.body), 'creado', 'cliente', 201);
}

export function listarPuntosCliente(req, res, next) {
  const consulta = leerConsulta(req.query);
  if (!consulta) return responderConsultaInvalida(res);
  const clienteId = leerEntero(req.params.clienteId, 2147483647);
  return responderOperacion(res, next,
    () => obtenerPuntosCliente({ clienteId, ...consulta }), 'consultado', 'movimientos');
}

export function editarCliente(req, res, next) {
  const clienteId = leerEntero(req.params.clienteId, 2147483647);
  return responderOperacion(res, next,
    () => actualizarCliente({ clienteId, datos: req.body }), 'actualizado', 'cliente');
}

export function listarDireccionesCliente(req, res, next) {
  const consulta = leerConsulta(req.query);
  if (!consulta) return responderConsultaInvalida(res);
  const clienteId = leerEntero(req.params.clienteId, 2147483647);
  return responderOperacion(res, next,
    () => obtenerDireccionesCliente({ clienteId, ...consulta }), 'consultado', 'direcciones');
}

export function registrarDireccionCliente(req, res, next) {
  const clienteId = leerEntero(req.params.clienteId, 2147483647);
  return responderOperacion(res, next,
    () => crearDireccionCliente({ clienteId, datos: req.body }), 'creado', 'direccion', 201);
}

export function editarDireccionCliente(req, res, next) {
  const clienteId = leerEntero(req.params.clienteId, 2147483647);
  const direccionId = leerEntero(req.params.direccionId, 2147483647);
  return responderOperacion(res, next,
    () => actualizarDireccionCliente({ clienteId, direccionId, datos: req.body }), 'actualizado', 'direccion');
}
