import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';

import {
  AuthSesion,
  Usuario,
  Rol,
  Permiso
} from '../models/index.js';

import { verificarTokenAcceso } from '../security/token.js';

import {
  NOMBRE_COOKIE_SESION,
  borrarCookieSesion
} from '../security/cookies.js';

// Retirar una cookie ausente, inválida, vencida o revocada.
function rechazarAcceso(res) {
  borrarCookieSesion(res);

  return res.status(401).json({
    mensaje: 'Autenticación requerida.'
  });
}

export async function autenticar(req, res, next) {
  res.set('Cache-Control', 'no-store');

  // La cookie es interpretada previamente por cookie-parser.
  const token = req.cookies?.[NOMBRE_COOKIE_SESION];

  if (typeof token !== 'string' || token.length === 0) {
    return rechazarAcceso(res);
  }

  try {
    const datosToken = verificarTokenAcceso(token);

    // Exigir una sesión existente, del mismo usuario,
    // sin revocación y todavía vigente.
    const sesion = await AuthSesion.findOne({
      where: {
        session_uid: datosToken.sesionUid,
        usuario_id: datosToken.usuarioId,
        revocada_en: null,
        expira_en: {
          [Op.gt]: new Date()
        }
      },

      attributes: [
        'id',
        'session_uid',
        'usuario_id',
        'expira_en'
      ],

      include: [{
        model: Usuario,
        as: 'usuario',

        attributes: [
          'id',
          'nombre_completo',
          'email',
          'estado',
          'rol_id'
        ],

        include: [{
          model: Rol,
          as: 'rol',
          attributes: ['id', 'nombre'],

          include: [{
            model: Permiso,
            as: 'permisos',
            attributes: ['modulo', 'accion'],
            through: { attributes: [] }
          }]
        }]
      }]
    });

    const usuario = sesion?.usuario;
    const rol = usuario?.rol;

    if (!sesion || usuario?.estado !== 'activo' || !rol) {
      return rechazarAcceso(res);
    }

    // Guardar únicamente datos seleccionados para los siguientes handlers.
    // Los permisos se consultan en MySQL, no se confía en datos del cliente.
    req.auth = {
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre_completo,
        email: usuario.email,

        rol: {
          id: rol.id,
          nombre: rol.nombre
        },

        permisos: rol.permisos.map(permiso => ({
          modulo: permiso.modulo,
          accion: permiso.accion
        }))
      },

      sesion: {
        id: sesion.id,
        uid: sesion.session_uid,
        expiraEn: sesion.expira_en
      }
    };

    return next();
  } catch (error) {
    // Incluye errores de firma, formato y vencimiento del JWT.
    if (error instanceof jwt.JsonWebTokenError) {
      return rechazarAcceso(res);
    }

    // Un fallo de MySQL es un error interno, no credenciales inválidas.
    return next(error);
  }
}