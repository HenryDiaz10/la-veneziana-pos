import {
  obtenerGruposPaginados,
  crearGrupoModificador,
  actualizarGrupoModificador
} from '../services/modificadores.service.js';

function leerEnteroPositivo(valor, maximo) {
  if (
    typeof valor !== 'string' ||
    !/^[1-9]\d*$/.test(valor)
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isSafeInteger(numero) && numero <= maximo
    ? numero
    : null;
}

// Listar grupos con un máximo de 50 registros por página.
export async function listarGrupos(req, res, next) {
  const pagina = leerEnteroPositivo(req.query.pagina ?? '1', 10000);
  const limite = leerEnteroPositivo(req.query.limite ?? '20', 50);

  if (pagina === null || limite === null) {
    return res.status(400).json({
      mensaje: 'Paginación inválida. Página máxima: 10000; límite máximo: 50.'
    });
  }

  try {
    const resultado = await obtenerGruposPaginados({ pagina, limite });

    if (resultado.estado !== 'consultado') {
      throw new Error('Resultado inesperado al consultar grupos.');
    }

    return res.status(200).json({
      grupos: resultado.grupos,
      paginacion: resultado.paginacion
    });
  } catch (error) {
    return next(error);
  }
}

export async function registrarGrupo(req, res, next) {
  try {
    const resultado = await crearGrupoModificador(req.body);

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Datos inválidos. Revisa el nombre y las opciones del grupo.'
      });
    }

    if (resultado.estado !== 'creado') {
      throw new Error('Resultado inesperado al crear un grupo.');
    }

    return res.status(201).json({
      mensaje: 'Grupo de modificadores creado correctamente.',
      grupo: resultado.grupo
    });
  } catch (error) {
    return next(error);
  }
}

export async function editarGrupo(req, res, next) {
  const grupoId = leerEnteroPositivo(req.params.grupoId, 2147483647);

  if (grupoId === null) {
    return res.status(400).json({
      mensaje: 'El identificador del grupo no es válido.'
    });
  }

  try {
    const resultado = await actualizarGrupoModificador({
      grupoId,
      datos: req.body
    });

    if (resultado.estado === 'datos_invalidos') {
      return res.status(400).json({
        mensaje: 'Envía al menos un campo permitido con un valor válido.'
      });
    }

    if (resultado.estado === 'grupo_inexistente') {
      return res.status(404).json({
        mensaje: 'El grupo indicado no existe.'
      });
    }

    if (resultado.estado !== 'actualizado') {
      throw new Error('Resultado inesperado al actualizar un grupo.');
    }

    return res.status(200).json({
      mensaje: 'Grupo de modificadores actualizado correctamente.',
      grupo: resultado.grupo
    });
  } catch (error) {
    return next(error);
  }
}