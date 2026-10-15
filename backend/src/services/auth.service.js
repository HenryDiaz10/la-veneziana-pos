import { randomBytes } from 'node:crypto';
import { sequelize } from '../config/database.js';
import { Usuario, Rol, Permiso } from '../models/index.js';

import {
  crearHashPassword,
  verificarPassword
} from '../security/password.js';

import {
  CONFIG_TOKEN,
  crearTokenAcceso
} from '../security/token.js';

import { validarCredencialesLogin } from '../validators/login.js';

// Política inicial de bloqueo.
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

// Preparar una sola vez un hash para las cuentas inexistentes.
// Permite realizar una comparación bcrypt también en esos casos.
let promesaHashSimulado;

function obtenerHashSimulado() {
  if (!promesaHashSimulado) {
    promesaHashSimulado = crearHashPassword(
      randomBytes(32).toString('hex')
    );
  }

  return promesaHashSimulado;
}

export async function iniciarSesion(datos) {
  const credenciales = validarCredencialesLogin(datos);

  if (!credenciales) {
    return { estado: 'datos_invalidos' };
  }

  const hashSimulado = await obtenerHashSimulado();

  return sequelize.transaction(async transaction => {
    // Bloquear la fila mientras comprobamos y actualizamos los intentos.
    // Evita que dos solicitudes sobrescriban el mismo contador.
    const usuario = await Usuario.findOne({
      where: {
        email: credenciales.email
      },

      attributes: [
        'id',
        'nombre_completo',
        'email',
        'password_hash',
        'rol_id',
        'estado',
        'intentos_fallidos',
        'bloqueado_hasta'
      ],

      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const passwordCorrecto = await verificarPassword(
      credenciales.password,
      usuario?.password_hash ?? hashSimulado
    );

    const ahora = new Date();

    const bloqueoVigente = (
      usuario?.bloqueado_hasta &&
      usuario.bloqueado_hasta.getTime() > ahora.getTime()
    );

    // Mantener el mismo resultado para cuenta inexistente,
    // inactiva, bloqueada o contraseña incorrecta.
    if (
      !usuario ||
      usuario.estado !== 'activo' ||
      bloqueoVigente
    ) {
      return { estado: 'credenciales_invalidas' };
    }

    if (!passwordCorrecto) {
      // Si había un bloqueo que ya venció, iniciar un nuevo contador.
      const intentosPrevios = usuario.bloqueado_hasta
        ? 0
        : usuario.intentos_fallidos;

      const intentos = Math.min(
        intentosPrevios + 1,
        MAX_INTENTOS
      );

      await usuario.update(
        {
          intentos_fallidos: intentos,

          bloqueado_hasta: intentos >= MAX_INTENTOS
            ? new Date(ahora.getTime() + BLOQUEO_MS)
            : null
        },
        {
          fields: ['intentos_fallidos', 'bloqueado_hasta'],
          transaction
        }
      );

      // Devolver normalmente permite confirmar el contador.
      return { estado: 'credenciales_invalidas' };
    }

    // Consultar el rol y sus permisos actuales.
    const rol = await Rol.findByPk(usuario.rol_id, {
      attributes: ['id', 'nombre'],

      include: [{
        model: Permiso,
        as: 'permisos',
        attributes: ['modulo', 'accion'],
        through: { attributes: [] }
      }],

      transaction
    });

    if (!rol) {
      return { estado: 'credenciales_invalidas' };
    }

    // Un acceso correcto limpia el contador y registra la fecha.
    await usuario.update(
      {
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        ultimo_acceso: ahora
      },
      {
        fields: [
          'intentos_fallidos',
          'bloqueado_hasta',
          'ultimo_acceso'
        ],
        transaction
      }
    );

    // Construir una respuesta explícita, sin devolver el modelo completo.
    return {
      estado: 'autenticado',
      token: crearTokenAcceso(usuario.id),
      expiraEn: CONFIG_TOKEN.duracionSegundos,

      usuario: {
        id: usuario.id,
        nombre: usuario.nombre_completo,
        email: usuario.email,

        rol: {
          id: rol.id,
          nombre: rol.nombre
        },

        permisos: rol.permisos
          .map(permiso => ({
            modulo: permiso.modulo,
            accion: permiso.accion
          }))
          .sort((a, b) =>
            `${a.modulo}:${a.accion}`.localeCompare(
              `${b.modulo}:${b.accion}`
            )
          )
      }
    };
  });
}