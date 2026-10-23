import { Transaction, fn, col } from 'sequelize';
import { sequelize } from '../config/database.js';
import { ZonaRestaurante, MesaSalon, PedidoMaster, AuditLog } from '../models/index.js';
import { CAMPOS_MESA, CAMPOS_CUENTA_MESA, presentarMesa } from './mesas.service.js';
import { CUENTAS_ACTIVAS } from './mesas-reglas.js';

// Una única lectura coherente; consultar el mapa nunca ocupa ni libera mesas.
export async function consultarSalon() {
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
    const zonas = await ZonaRestaurante.findAll({ attributes: ['id', 'nombre', 'aforo_maximo'], order: [['id', 'ASC']], transaction, raw: true });
    const mesas = await MesaSalon.findAll({ attributes: CAMPOS_MESA, order: [['codigo_mesa', 'ASC'], ['id', 'ASC']], transaction, raw: true });
    const ids = mesas.map(m => m.id);
    const cuentas = ids.length ? await PedidoMaster.findAll({ where: { mesa_id: ids, estado_cuenta: CUENTAS_ACTIVAS }, attributes: CAMPOS_CUENTA_MESA, transaction, raw: true }) : [];
    const marcas = ids.length ? await AuditLog.findAll({ where: { entidad_afectada: 'mesas_salon', entidad_id: ids }, attributes: ['entidad_id', [fn('MAX', col('id')), 'marca']], group: ['entidad_id'], transaction, raw: true }) : [];
    const porMesa = new Map(cuentas.map(p => [p.mesa_id, p])), porMarca = new Map(marcas.map(a => [String(a.entidad_id), a.marca]));
    return { consultado_en: new Date().toISOString(), zonas, mesas: mesas.map(m => presentarMesa(m, porMesa.get(m.id), porMarca.get(String(m.id)) ?? null)) };
  });
}
