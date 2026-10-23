import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { KdsTarea, PedidoItemKds, PedidoMaster, MesaSalon } from '../models/index.js';
import { consultaKds, ESTADOS_ACTIVOS_KDS, presentarTareaKds } from './kds-protocolo.js';
import { idGrande, exigirPedido as exigir } from './pedidos-calculo.js';

const camposTarea = ['id', 'pedido_item_id', 'componente_numero', 'cantidad', 'snapshot_json', 'estado', 'version', 'enviado_en', 'iniciado_en', 'horno_en', 'listo_en', 'entregado_en'];
async function presentar(filas, transaction) {
  if (!filas.length) return [];
  const items = await PedidoItemKds.findAll({ where: { id: filas.map(t => t.pedido_item_id) }, attributes: ['id', 'pedido_id', 'notas_preparacion'], transaction, raw: true });
  const pedidos = await PedidoMaster.findAll({ where: { id: [...new Set(items.map(i => i.pedido_id))] }, attributes: ['id', 'codigo_pedido', 'tipo_atencion', 'mesa_id', 'estado_cuenta'], transaction, raw: true });
  const mesaIds = [...new Set(pedidos.map(p => p.mesa_id).filter(Boolean))];
  const mesas = mesaIds.length ? await MesaSalon.findAll({ where: { id: mesaIds }, attributes: ['id', 'codigo_mesa', 'zona_id'], transaction, raw: true }) : [];
  const porItem = new Map(items.map(i => [String(i.id), i])), porPedido = new Map(pedidos.map(p => [String(p.id), p])), porMesa = new Map(mesas.map(m => [m.id, m]));
  return filas.map(t => { const i = porItem.get(String(t.pedido_item_id)), p = i && porPedido.get(String(i.pedido_id)); return presentarTareaKds(t, i, p, porMesa.get(p?.mesa_id)); });
}
export function consultarTareasKds(query) {
  const q = consultaKds(query);
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
    const canal = q.canal === 'todos' ? { [Op.in]: ['cocina', 'despacho'] } : q.canal;
    const filtro = { estado: ESTADOS_ACTIVOS_KDS, 'snapshot_json.canal': canal };
    // Fijar el límite superior de creación para recorrer páginas sin incluir altas posteriores.
    const ultima = q.hasta ?? (await KdsTarea.findOne({ where: filtro, attributes: ['id'], order: [['id', 'DESC']], transaction, raw: true }))?.id;
    const hasta = ultima ? String(ultima) : null;
    const filas = hasta ? await KdsTarea.findAll({ where: { ...filtro, id: { [Op.lte]: hasta, ...(q.desde ? { [Op.gt]: q.desde } : {}) } }, attributes: camposTarea, order: [['id', 'ASC']], limit: q.limite + 1, transaction, raw: true }) : [];
    const hayMas = filas.length > q.limite; if (hayMas) filas.pop();
    return { tareas: await presentar(filas, transaction), paginacion: { limite: q.limite, hasta, siguiente: hayMas ? String(filas.at(-1).id) : null }, servidor_en: new Date().toISOString() };
  });
}
export function consultarTareaKds(id) {
  id = idGrande(id);
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
    // Incluir estados finales permite quitar tareas entregadas/canceladas tras un aviso.
    const t = await KdsTarea.findByPk(id, { attributes: camposTarea, transaction, raw: true });
    exigir(t && ['cocina', 'despacho'].includes(t.snapshot_json?.canal), 'TAREA_KDS_INEXISTENTE');
    return { tarea: (await presentar([t], transaction))[0], servidor_en: new Date().toISOString() };
  });
}
