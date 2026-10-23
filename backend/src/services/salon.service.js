import { Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { ZonaRestaurante, MesaSalon } from '../models/index.js';

// Una única lectura coherente; consultar el mapa nunca ocupa ni libera mesas.
export async function consultarSalon() {
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
    const zonas = await ZonaRestaurante.findAll({ attributes: ['id', 'nombre', 'aforo_maximo'], order: [['id', 'ASC']], transaction, raw: true });
    const mesas = await MesaSalon.findAll({ attributes: ['id', 'zona_id', 'codigo_mesa', 'capacidad_sillas', 'estado_actual', 'mesero_asignado_id', 'posicion_x', 'posicion_y'], order: [['codigo_mesa', 'ASC'], ['id', 'ASC']], transaction, raw: true });
    return { consultado_en: new Date().toISOString(), zonas, mesas };
  });
}
