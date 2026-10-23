import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AuthSesion } from '../models/index.js';
import { CONFIG_TOKEN, crearTokenAcceso } from '../security/token.js';
import { calcularRenovacionSesion } from '../security/sesion.js';
import { establecerCookieSesion } from '../security/cookies.js';

// Adaptar sesiones cortas de la política anterior sin rebasar ocho horas desde
// su creación. Las sesiones nuevas ya tienen ese plazo y no requieren renovación.
export async function renovarSesionActiva(req, res, next) {
  try {
    const calcular = creadoEn => calcularRenovacionSesion({ creadoEn,
      expiraTokenEn: req.auth.sesion.expiraTokenEn, duracionSegundos: CONFIG_TOKEN.duracionSegundos });
    if (!calcular(req.auth.sesion.creadoEn)) return next();

    const renovacion = await sequelize.transaction(async transaction => {
      // Bloquear la sesión evita perder una revocación o acortar su plazo si
      // varias pestañas solicitan renovación al mismo tiempo.
      const sesion = await AuthSesion.findOne({ where: {
        id: req.auth.sesion.id, session_uid: req.auth.sesion.uid,
        usuario_id: req.auth.usuario.id, revocada_en: null, expira_en: { [Op.gt]: new Date() }
      }, transaction, lock: transaction.LOCK.UPDATE });
      if (!sesion) return null;
      const expiraEn = calcular(sesion.creado_en);
      if (!expiraEn) return null;
      if (expiraEn.getTime() > sesion.expira_en.getTime()) {
        await sesion.update({ expira_en: expiraEn }, { fields: ['expira_en'], transaction });
      }
      return { expiraEn, token: crearTokenAcceso(req.auth.usuario.id, { sesionUid: sesion.session_uid, expiraEn }) };
    });
    if (!renovacion) return res.status(401).json({ mensaje: 'La sesión finalizó. Vuelve a ingresar.' });
    establecerCookieSesion(res, renovacion.token);
    req.auth.sesion.expiraEn = renovacion.expiraEn;
    return next();
  } catch (error) { return next(error); }
}
