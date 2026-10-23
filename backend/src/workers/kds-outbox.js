import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { EventoOutbox } from '../models/index.js';
import logger from '../logger.js';
import { notificacionKds, demoraReintentoKds, TIPOS_EVENTO_KDS } from '../services/kds-protocolo.js';
import { idGrande } from '../services/pedidos-calculo.js';

// Solo ve filas confirmadas; SKIP LOCKED evita que dos lectores reclamen el
// mismo evento. El envío y su marca no son atómicos: el receptor deduplica UID.
export async function publicarLoteKds({ publicar, limite = 20, ahora = new Date(), ids = null }) {
  if (typeof publicar !== 'function' || !Number.isInteger(limite) || limite < 1 || limite > 100 || !(ahora instanceof Date) || !Number.isFinite(ahora.getTime()) ||
    (ids !== null && (!Array.isArray(ids) || ids.length < 1 || ids.length > 100))) throw new TypeError('Lote KDS no válido');
  // El filtro interno permite probar exclusivamente filas temporales propias.
  const seleccion = ids === null ? null : ids.map(idGrande);
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async transaction => {
    // Sequelize 6 omite skipLocked en MySQL. Usar SQL explícito parametrizado
    // de MySQL 8, sin interpolar valores ni esperar filas no confirmadas.
    const filas = await sequelize.query(`SELECT CAST(id AS CHAR) AS id FROM eventos_outbox
      WHERE sala_destino = 'kds' AND tipo IN (:tipos) AND publicado_en IS NULL
        AND (proximo_intento_en IS NULL OR proximo_intento_en <= :ahora)
        ${seleccion ? 'AND id IN (:ids)' : ''}
      ORDER BY eventos_outbox.id ASC LIMIT :limite FOR UPDATE SKIP LOCKED`, {
      // replacements de Date usa la zona del proceso en Sequelize 6; enviar UTC
      // explícito para comparar contra las sesiones MySQL configuradas en UTC.
      replacements: { tipos: TIPOS_EVENTO_KDS, ahora: ahora.toISOString().slice(0, 19).replace('T', ' '), limite, ...(seleccion ? { ids: seleccion } : {}) }, type: QueryTypes.SELECT, transaction
    });
    const eventos = filas.length ? await EventoOutbox.findAll({ where: { id: filas.map(f => f.id) }, order: [['id', 'ASC']], transaction }) : [];
    let publicados = 0, fallidos = 0;
    for (const evento of eventos) {
      const intentos = Math.min(evento.intentos + 1, 2147483647);
      try {
        await publicar(notificacionKds(evento));
        await evento.update({ publicado_en: new Date(), proximo_intento_en: null, intentos }, { transaction });
        publicados++;
      } catch {
        // TIMESTAMP del SQL tiene precisión de segundos: redondear hacia arriba.
        const siguiente = new Date(Math.ceil((ahora.getTime() + demoraReintentoKds(intentos)) / 1000) * 1000);
        await evento.update({ publicado_en: null, intentos, proximo_intento_en: siguiente }, { transaction });
        fallidos++;
      }
    }
    return { publicados, fallidos };
  });
}
export function iniciarWorkerKds({ publicar, intervaloMs = 1000, ids = null }) {
  let detener = false, reloj, trabajo = Promise.resolve();
  const ejecutar = () => {
    if (detener) return;
    trabajo = publicarLoteKds({ publicar, ids }).then(r => {
      if (r.fallidos) logger.warn({ cantidad: r.fallidos }, 'Eventos KDS pendientes de reintento.');
    }).catch(e => {
      // No registrar SQL, payload, cookies ni notas de preparación.
      logger.warn({ errorName: e.name, code: e.original?.code ?? e.code }, 'No se pudo procesar el outbox KDS.');
    }).finally(() => { if (!detener) { reloj = setTimeout(ejecutar, intervaloMs); reloj.unref(); } });
  };
  ejecutar();
  return { async detener() { detener = true; clearTimeout(reloj); await trabajo; } };
}
