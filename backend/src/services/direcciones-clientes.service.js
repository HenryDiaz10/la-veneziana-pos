import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Cliente, DireccionCliente } from '../models/index.js';
import { validarDireccionCliente } from '../validators/direcciones-clientes.js';
import {
  esIdClienteValido, esPaginacionClienteValida
} from './clientes.service.js';
import { validarBusquedaCliente } from '../validators/clientes.js';

const CAMPOS = ['id', 'cliente_id', 'alias', 'direccion_completa', 'referencia',
  'coordenadas_gps', 'es_predeterminada'];
const serializar = direccion => Object.fromEntries(CAMPOS.map(c => [c, direccion.get(c)]));

// Las direcciones también requieren coincidencia exacta con la búsqueda.
export async function obtenerDireccionesCliente({ clienteId, busqueda, pagina = 1, limite = 10 }) {
  const filtro = validarBusquedaCliente(busqueda);
  if (!esIdClienteValido(clienteId) || !filtro || !esPaginacionClienteValida(pagina, limite)) {
    return { estado: 'datos_invalidos' };
  }
  const cliente = await Cliente.findOne({ attributes: ['id'], where: { id: clienteId, ...filtro } });
  if (!cliente) return { estado: 'cliente_inexistente' };
  const { count, rows } = await DireccionCliente.findAndCountAll({
    attributes: CAMPOS, where: { cliente_id: clienteId },
    order: [['es_predeterminada', 'DESC'], ['id', 'ASC']],
    limit: limite, offset: (pagina - 1) * limite
  });
  return { estado: 'consultado', direcciones: rows.map(serializar),
    paginacion: { pagina, limite, total: count, totalPaginas: Math.ceil(count / limite) } };
}

// Bloquear primero al cliente serializa la elección de dirección preferida.
async function guardarDireccion({ clienteId, direccionId, datos }) {
  const parcial = direccionId !== undefined;
  const entrada = validarDireccionCliente(datos, { parcial });
  if (!esIdClienteValido(clienteId) || (parcial && !esIdClienteValido(direccionId)) || !entrada) {
    return { estado: 'datos_invalidos' };
  }
  return sequelize.transaction(async transaction => {
    const cliente = await Cliente.findByPk(clienteId, {
      attributes: ['id'], transaction, lock: transaction.LOCK.UPDATE
    });
    if (!cliente) return { estado: 'cliente_inexistente' };
    let direccion;
    if (parcial) {
      direccion = await DireccionCliente.findOne({
        attributes: CAMPOS, where: { id: direccionId, cliente_id: clienteId },
        transaction, lock: transaction.LOCK.UPDATE
      });
      if (!direccion) return { estado: 'direccion_inexistente' };
    }
    if (entrada.es_predeterminada === true) {
      // Solo una dirección predeterminada por cliente en estas operaciones.
      await DireccionCliente.update({ es_predeterminada: false }, {
        where: {
          cliente_id: clienteId,
          ...(parcial ? { id: { [Op.ne]: direccionId } } : {})
        }, fields: ['es_predeterminada'], transaction
      });
    }
    if (parcial) await direccion.update(entrada, { fields: Object.keys(entrada), transaction });
    else {
      const valores = { ...entrada, cliente_id: clienteId };
      direccion = await DireccionCliente.create(valores, { fields: Object.keys(valores), transaction });
    }
    await direccion.reload({ attributes: CAMPOS, transaction });
    return { estado: parcial ? 'actualizado' : 'creado', direccion: serializar(direccion) };
  });
}

export function crearDireccionCliente({ clienteId, datos }) {
  return guardarDireccion({ clienteId, datos });
}

export function actualizarDireccionCliente({ clienteId, direccionId, datos }) {
  return guardarDireccion({ clienteId, direccionId, datos });
}
