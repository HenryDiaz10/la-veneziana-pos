import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';

import {
  Usuario,
  Rol,
  Permiso,
  RolPermiso,
  AutorizacionSensible
} from '../models/index.js';

import { validarAltaAutorizacion } from '../validators/autorizaciones.js';

import {
  obtenerPoliticaAutorizacion,
  VIGENCIA_AUTORIZACION_MS
} from '../security/politicasAutorizacion.js';

// Consultar permisos actuales mediante lecturas con bloqueo.
async function tienePermiso(rolId, modulo, accion, transaction) {
  const permiso = await Permiso.findOne({
    where: { modulo, accion },
    attributes: ['id'],
    transaction,
    lock: transaction.LOCK.SHARE
  });

  if (permiso === null) {
    return false;
  }

  const asignacion = await RolPermiso.findOne({
    where: {
      rol_id: rolId,
      permiso_id: permiso.id
    },
    attributes: ['rol_id'],
    transaction,
    lock: transaction.LOCK.SHARE
  });

  return asignacion !== null;
}

// Registrar una aprobación limitada a una acción y un recurso.
export async function crearAutorizacion({
  aprobadorId,
  datos
}) {
  const entrada = validarAltaAutorizacion(datos);

  if (
    entrada === null ||
    !Number.isSafeInteger(aprobadorId) ||
    aprobadorId <= 0 ||
    aprobadorId > 2147483647
  ) {
    return { estado: 'datos_invalidos' };
  }

  const politica = obtenerPoliticaAutorizacion(
    entrada.accion,
    entrada.entidad
  );

  if (politica === null) {
    return { estado: 'accion_no_habilitada' };
  }

  return sequelize.transaction(async transaction => {
    // Coordinar con los cambios de estado, rol y permisos.
    const administrador = await Rol.findOne({
      where: { nombre: 'administrador' },
      attributes: ['id'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (administrador === null) {
      throw new Error('No existe el rol administrador.');
    }

    const usuarios = await Usuario.findAll({
      where: {
        id: {
          [Op.in]: [entrada.actorId, aprobadorId]
        }
      },
      attributes: ['id', 'estado', 'rol_id'],
      order: [['id', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const actor = usuarios.find(
      usuario => usuario.id === entrada.actorId
    );

    const aprobador = usuarios.find(
      usuario => usuario.id === aprobadorId
    );

    if (!aprobador || aprobador.estado !== 'activo') {
      return { estado: 'aprobador_invalido' };
    }

    if (!actor || actor.estado !== 'activo') {
      return { estado: 'actor_invalido' };
    }

    // Exigir gestión de seguridad y permiso para la acción aprobada.
    const puedeAprobar = await tienePermiso(
      aprobador.rol_id,
      'seguridad',
      'gestionar',
      transaction
    );

    const puedeAutorizarAccion = await tienePermiso(
      aprobador.rol_id,
      politica.moduloPermiso,
      politica.accionPermiso,
      transaction
    );

    if (!puedeAprobar || !puedeAutorizarAccion) {
      return { estado: 'sin_permiso' };
    }

    // La aprobación complementa los permisos del actor.
    const puedeEjecutar = await tienePermiso(
      actor.rol_id,
      politica.moduloPermiso,
      politica.accionPermiso,
      transaction
    );

    if (!puedeEjecutar) {
      return { estado: 'actor_sin_permiso' };
    }

    const recurso = await politica.modelo.findByPk(
      entrada.entidadId,
      {
        attributes: ['id'],
        transaction
      }
    );

    if (recurso === null) {
      return { estado: 'recurso_inexistente' };
    }

    const autorizacion = await AutorizacionSensible.create({
      actor_id: actor.id,
      aprobador_id: aprobador.id,
      accion: entrada.accion,
      entidad: entrada.entidad,
      entidad_id: entrada.entidadId,
      motivo: entrada.motivo,
      expira_en: new Date(
        Date.now() + VIGENCIA_AUTORIZACION_MS
      ),
      consumida_en: null
    }, {
      transaction
    });

    return {
      estado: 'creada',
      autorizacion: {
        id: String(autorizacion.id),
        actorId: actor.id,
        aprobadorId: aprobador.id,
        accion: autorizacion.accion,
        entidad: autorizacion.entidad,
        entidadId: entrada.entidadId,
        motivo: autorizacion.motivo,
        expiraEn: autorizacion.expira_en
      }
    };
  });
}

// Permitir que los controladores identifiquen un rechazo esperado.
export class AutorizacionNoValidaError extends Error {
  constructor() {
    super('La autorización no es válida para esta operación.');
    this.name = 'AutorizacionNoValidaError';
  }
}

// Consumir una autorización dentro de la transacción de la operación.
// actorId debe proceder de la sesión.
// accion, entidad y entidadId deben corresponder a la operación real.
export async function consumirAutorizacion({
  autorizacionId,
  actorId,
  accion,
  entidad,
  entidadId,
  transaction
}) {
  // No abrir una transacción independiente:
  // consumo y operación deben confirmarse o revertirse juntos.
  if (
    !transaction ||
    transaction.sequelize !== sequelize ||
    transaction.finished
  ) {
    throw new TypeError('Se requiere una transacción activa.');
  }

  const politica = obtenerPoliticaAutorizacion(accion, entidad);

  // Tratar el identificador BIGINT como texto para evitar redondeos.
  if (
    typeof autorizacionId !== 'string' ||
    !/^[1-9]\d{0,18}$/.test(autorizacionId) ||
    BigInt(autorizacionId) > 9223372036854775807n ||
    !Number.isSafeInteger(actorId) ||
    actorId <= 0 ||
    actorId > 2147483647 ||
    !Number.isSafeInteger(entidadId) ||
    entidadId <= 0 ||
    politica === null
  ) {
    throw new AutorizacionNoValidaError();
  }

  // Coordinar con la gestión de estados, roles y permisos.
  const administrador = await Rol.findOne({
    where: { nombre: 'administrador' },
    attributes: ['id'],
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (administrador === null) {
    throw new Error('No existe el rol administrador.');
  }

  const autorizacion = await AutorizacionSensible.findByPk(
    autorizacionId,
    {
      transaction,
      lock: transaction.LOCK.UPDATE
    }
  );

  if (
    autorizacion === null ||
    autorizacion.actor_id !== actorId ||
    autorizacion.accion !== accion ||
    autorizacion.entidad !== entidad ||
    String(autorizacion.entidad_id) !== String(entidadId) ||
    autorizacion.consumida_en !== null ||
    autorizacion.expira_en.getTime() <= Date.now()
  ) {
    throw new AutorizacionNoValidaError();
  }

  const usuarios = await Usuario.findAll({
    where: {
      id: {
        [Op.in]: [actorId, autorizacion.aprobador_id]
      }
    },
    attributes: ['id', 'estado', 'rol_id'],
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  const actor = usuarios.find(usuario => usuario.id === actorId);

  const aprobador = usuarios.find(
    usuario => usuario.id === autorizacion.aprobador_id
  );

  if (
    !actor ||
    !aprobador ||
    actor.estado !== 'activo' ||
    aprobador.estado !== 'activo'
  ) {
    throw new AutorizacionNoValidaError();
  }

  // Comprobar otra vez los permisos al utilizar la aprobación.
  const comprobaciones = [
    [aprobador.rol_id, 'seguridad', 'gestionar'],
    [
      aprobador.rol_id,
      politica.moduloPermiso,
      politica.accionPermiso
    ],
    [
      actor.rol_id,
      politica.moduloPermiso,
      politica.accionPermiso
    ]
  ];

  for (const [rolId, modulo, permisoAccion] of comprobaciones) {
    if (!(await tienePermiso(
      rolId,
      modulo,
      permisoAccion,
      transaction
    ))) {
      throw new AutorizacionNoValidaError();
    }
  }

  const recurso = await politica.modelo.findByPk(entidadId, {
    attributes: ['id'],
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (recurso === null) {
    throw new AutorizacionNoValidaError();
  }

  // Volver a comprobar el vencimiento en el momento del consumo.
  const ahora = new Date();

  const [actualizadas] = await AutorizacionSensible.update({
    consumida_en: ahora
  }, {
    where: {
      id: autorizacionId,
      consumida_en: null,
      expira_en: { [Op.gt]: ahora }
    },
    transaction,
    fields: ['consumida_en']
  });

  if (actualizadas !== 1) {
    throw new AutorizacionNoValidaError();
  }

  return {
    id: String(autorizacion.id),
    consumidaEn: ahora
  };
}