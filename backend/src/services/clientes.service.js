import { QueryTypes, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Cliente } from '../models/index.js';
import {
  validarCliente,
  validarBusquedaCliente,
  esPerfilClienteValido
} from '../validators/clientes.js';

const CAMPOS_CLIENTE = ['id', 'nombres', 'apellidos', 'tipo_documento',
  'numero_documento', 'telefono_principal'];

export function esIdClienteValido(id) {
  return Number.isSafeInteger(id) && id > 0 && id <= 2147483647;
}

export function esPaginacionClienteValida(pagina, limite) {
  return Number.isSafeInteger(pagina) && pagina > 0 && pagina <= 10000 &&
    Number.isSafeInteger(limite) && limite > 0 && limite <= 20;
}

function serializarCliente(cliente) {
  return Object.fromEntries(CAMPOS_CLIENTE.map(c => [c, cliente.get(c)]));
}

export async function buscarClientes({ busqueda, pagina = 1, limite = 10 }) {
  const filtro = validarBusquedaCliente(busqueda);
  if (!filtro || !esPaginacionClienteValida(pagina, limite)) return { estado: 'datos_invalidos' };
  const { count, rows } = await Cliente.findAndCountAll({
    attributes: CAMPOS_CLIENTE, where: filtro, order: [['id', 'ASC']],
    limit: limite, offset: (pagina - 1) * limite
  });
  return { estado: 'consultado', clientes: rows.map(serializarCliente),
    paginacion: { pagina, limite, total: count, totalPaginas: Math.ceil(count / limite) } };
}

// La ficha limitada exige también el documento/teléfono de búsqueda.
// No permite recorrer perfiles únicamente incrementando sus IDs.
export async function obtenerPerfilCliente({ clienteId, busqueda }) {
  const filtro = validarBusquedaCliente(busqueda);
  if (!esIdClienteValido(clienteId) || !filtro) return { estado: 'datos_invalidos' };
  return sequelize.transaction(async transaction => {
    const cliente = await Cliente.findOne({
      attributes: [...CAMPOS_CLIENTE, 'nivel_vip', 'puntos_vip_actuales'],
      where: { id: clienteId, ...filtro }, transaction
    });
    if (!cliente) return { estado: 'cliente_inexistente' };
    // Métrica de actividad, no un cálculo de facturación ni de puntos.
    // Incluir cobros registrados aunque su emisión fiscal haya sido rechazada.
    const [actividad] = await sequelize.query(`
      SELECT COUNT(*) AS compras, MAX(v.fecha_emision) AS ultima_compra
      FROM ventas_comprobantes v
      INNER JOIN pedidos_master p ON p.id = v.pedido_id
      WHERE p.cliente_id = :clienteId AND p.estado_cuenta = 'pagada'
        AND v.estado_emision IN ('emitida', 'rechazada_sunat')
    `, { replacements: { clienteId }, type: QueryTypes.SELECT, transaction, logging: false });
    const compras = Number(actividad.compras);
    if (!Number.isSafeInteger(compras) || compras < 0) throw new Error('Conteo de compras inválido.');
    return { estado: 'consultado', cliente: {
      ...serializarCliente(cliente), nivel_vip: cliente.nivel_vip,
      puntos_vip_actuales: cliente.puntos_vip_actuales,
      actividad: {
        compras_registradas: compras,
        ultima_compra: actividad.ultima_compra,
        segmento: compras === 0 ? 'sin_compras' : compras === 1 ? 'primera_compra' : 'recurrente'
      }
    } };
  });
}

export async function crearCliente(datos) {
  const entrada = validarCliente(datos);
  if (!entrada) return { estado: 'datos_invalidos' };
  try {
    return await sequelize.transaction(async transaction => {
      const cliente = await Cliente.create(entrada, { fields: Object.keys(entrada), transaction });
      await cliente.reload({ attributes: CAMPOS_CLIENTE, transaction });
      return { estado: 'creado', cliente: serializarCliente(cliente) };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) return { estado: 'documento_duplicado' };
    throw error;
  }
}

export async function actualizarCliente({ clienteId, datos }) {
  const entrada = validarCliente(datos, { parcial: true });
  if (!esIdClienteValido(clienteId) || !entrada) return { estado: 'datos_invalidos' };
  try {
    return await sequelize.transaction(async transaction => {
      const cliente = await Cliente.findByPk(clienteId, {
        attributes: CAMPOS_CLIENTE, transaction, lock: transaction.LOCK.UPDATE
      });
      if (!cliente) return { estado: 'cliente_inexistente' };
      if (!esPerfilClienteValido({ ...serializarCliente(cliente), ...entrada })) {
        return { estado: 'datos_invalidos' };
      }
      await cliente.update(entrada, { fields: Object.keys(entrada), transaction });
      await cliente.reload({ attributes: CAMPOS_CLIENTE, transaction });
      return { estado: 'actualizado', cliente: serializarCliente(cliente) };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) return { estado: 'documento_duplicado' };
    throw error;
  }
}
