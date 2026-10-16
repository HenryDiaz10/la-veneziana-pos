import { sequelize } from '../config/database.js';
import { ModificadorCatalogo } from '../models/index.js';

import {
  validarGrupoModificador
} from '../validators/modificadores.js';

const CAMPOS_GRUPO = [
  'id',
  'nombre_grupo',
  'es_multiple',
  'es_obligatorio'
];

function esIdValido(id) {
  return (
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 2147483647
  );
}

// Devolver exclusivamente los campos públicos del grupo.
function serializarGrupo(grupo) {
  return Object.fromEntries(
    CAMPOS_GRUPO.map(campo => [campo, grupo.get(campo)])
  );
}

// Consultar grupos sin cargar todas sus opciones y productos.
export async function obtenerGruposPaginados({
  pagina = 1,
  limite = 20
} = {}) {
  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 10000 ||
    !Number.isSafeInteger(limite) ||
    limite < 1 ||
    limite > 50
  ) {
    return { estado: 'datos_invalidos' };
  }

  const { count, rows } = await ModificadorCatalogo.findAndCountAll({
    attributes: CAMPOS_GRUPO,
    order: [['id', 'ASC']],
    limit: limite,
    offset: (pagina - 1) * limite
  });

  return {
    estado: 'consultado',
    grupos: rows.map(serializarGrupo),
    paginacion: {
      pagina,
      limite,
      total: count,
      totalPaginas: Math.ceil(count / limite)
    }
  };
}

// Crear el grupo; sus opciones se administrarán por separado.
export async function crearGrupoModificador(datos) {
  const entrada = validarGrupoModificador(datos);

  if (entrada === null) {
    return { estado: 'datos_invalidos' };
  }

  const valores = {
    es_multiple: false,
    es_obligatorio: false,
    ...entrada
  };

  return sequelize.transaction(async transaction => {
    const grupo = await ModificadorCatalogo.create(valores, {
      fields: Object.keys(valores),
      transaction
    });

    await grupo.reload({
      attributes: CAMPOS_GRUPO,
      transaction
    });

    return {
      estado: 'creado',
      grupo: serializarGrupo(grupo)
    };
  });
}

// Modificar únicamente los campos enviados y validados.
export async function actualizarGrupoModificador({ grupoId, datos }) {
  const entrada = validarGrupoModificador(datos, { parcial: true });

  if (!esIdValido(grupoId) || entrada === null) {
    return { estado: 'datos_invalidos' };
  }

  return sequelize.transaction(async transaction => {
    const grupo = await ModificadorCatalogo.findByPk(grupoId, {
      attributes: CAMPOS_GRUPO,
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (grupo === null) {
      return { estado: 'grupo_inexistente' };
    }

    await grupo.update(entrada, {
      fields: Object.keys(entrada),
      transaction
    });

    await grupo.reload({
      attributes: CAMPOS_GRUPO,
      transaction
    });

    return {
      estado: 'actualizado',
      grupo: serializarGrupo(grupo)
    };
  });
}