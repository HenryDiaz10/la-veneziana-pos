import { Op } from 'sequelize';
import { CajaFisica, SesionCajaZ } from '../models/index.js';
import { operacionComercial, auditoriaComercial } from './operacion-comercial.js';
import { campos, idEntero, centimos, dinero, exigirPedido as exigir } from './pedidos-calculo.js';

export async function consultarCaja(usuarioId) {
  const [cajas, sesion] = await Promise.all([
    CajaFisica.findAll({ where: { estado: 'activa' }, attributes: ['id', 'nombre_terminal'], order: [['id', 'ASC']] }),
    SesionCajaZ.findOne({ where: { cajero_id: usuarioId, estado_sesion: 'abierta' }, attributes: ['id', 'caja_fisica_id', 'cajero_id', 'apertura_fecha', 'apertura_monto_base', 'estado_sesion'] })
  ]);
  return { cajas, sesion };
}
export function abrirCaja(datos, contexto) {
  campos(datos, ['caja_fisica_id', 'apertura_monto_base']);
  exigir(idEntero(datos.caja_fisica_id));
  const monto = dinero(centimos(datos.apertura_monto_base));
  return operacionComercial({ ...contexto, tipo: 'caja.abrir', cuerpo: datos }, async tx => {
    const caja = await CajaFisica.findByPk(datos.caja_fisica_id, { transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(caja?.estado === 'activa', 'CAJA_NO_DISPONIBLE');
    const abierta = await SesionCajaZ.findOne({ where: { estado_sesion: 'abierta', [Op.or]: [
      { cajero_id: contexto.usuarioId }, { caja_fisica_id: caja.id }
    ] }, transaction: tx, lock: tx.LOCK.UPDATE });
    exigir(!abierta, 'CAJA_YA_ABIERTA');
    const s = await SesionCajaZ.create({ caja_fisica_id: caja.id, cajero_id: contexto.usuarioId, apertura_monto_base: monto }, { transaction: tx });
    await auditoriaComercial(contexto.usuarioId, 'sesiones_caja_z', s.id, { apertura_monto_base: monto }, tx);
    return { sesion: { id: s.id, caja_fisica_id: s.caja_fisica_id, cajero_id: s.cajero_id, apertura_monto_base: s.apertura_monto_base, estado_sesion: s.estado_sesion } };
  });
}
