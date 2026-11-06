import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { CategoriaGastoFijo, GastoFinancieroOperativo, MovimientoCajaChica, SesionCajaZ } from '../models/index.js';
import { operacionComercial, auditoriaComercial } from './operacion-comercial.js';
import { validarGasto, filtrosReporte } from './reportes-reglas.js';
import { campos, texto, centimos, exigirPedido as exigir } from './pedidos-calculo.js';

export async function categoriasGasto() {
  return { categorias: await CategoriaGastoFijo.findAll({ attributes: ['id', 'nombre', 'es_deducible_impuestos'], order: [['id', 'ASC']], raw: true }) };
}
export function registrarCategoriaGasto(datos, contexto) {
  campos(datos, ['nombre', 'es_deducible_impuestos']);
  const nombre = texto(datos.nombre, 100); exigir(nombre.length >= 2 && typeof datos.es_deducible_impuestos === 'boolean');
  return operacionComercial({ ...contexto, seguridad: true, tipo: 'gasto.categoria', cuerpo: { nombre, es_deducible_impuestos: datos.es_deducible_impuestos } }, async tx => {
    exigir(!await CategoriaGastoFijo.findOne({ where: { nombre }, transaction: tx }), 'CATEGORIA_GASTO_DUPLICADA');
    const c = await CategoriaGastoFijo.create({ nombre, es_deducible_impuestos: datos.es_deducible_impuestos }, { transaction: tx });
    await auditoriaComercial(contexto.usuarioId, 'categorias_gastos_fijos', c.id, { nombre }, tx);
    return { categoria: c.toJSON() };
  });
}
export function registrarGasto(datos, contexto) {
  const entrada = validarGasto(datos);
  return operacionComercial({ ...contexto, tipo: 'gasto.registrar', cuerpo: entrada }, async tx => {
    exigir(await CategoriaGastoFijo.findByPk(entrada.categoria_id, { transaction: tx, lock: tx.LOCK.SHARE }), 'CATEGORIA_GASTO_INEXISTENTE');
    if (entrada.movimiento_caja_id) {
      const referencia = await MovimientoCajaChica.findByPk(entrada.movimiento_caja_id, { attributes: ['sesion_id'], transaction: tx });
      exigir(referencia, 'MOVIMIENTO_GASTO_NO_VALIDO');
      // Mismo orden del cierre: sesión antes que movimiento. Clasificar un
      // egreso histórico no lo modifica ni altera el snapshot de cierre.
      await SesionCajaZ.findByPk(referencia.sesion_id, { transaction: tx, lock: tx.LOCK.UPDATE });
      const m = await MovimientoCajaChica.findByPk(entrada.movimiento_caja_id, { transaction: tx, lock: tx.LOCK.UPDATE });
      exigir(m.tipo === 'egreso' && m.autorizado_por && centimos(m.monto) === centimos(entrada.monto_gasto), 'MOVIMIENTO_GASTO_NO_VALIDO');
      exigir(!await GastoFinancieroOperativo.findOne({ where: { movimiento_caja_id: m.id }, transaction: tx }), 'MOVIMIENTO_YA_VINCULADO');
    }
    const gasto = await GastoFinancieroOperativo.create({ ...entrada, usuario_registro_id: contexto.usuarioId }, { transaction: tx });
    await auditoriaComercial(contexto.usuarioId, 'gastos_financieros_operativos', gasto.id, { ...entrada }, tx);
    return { gasto: gasto.toJSON() };
  });
}
export async function listarGastos(query) {
  const f = filtrosReporte(query, true);
  const filas = await sequelize.query(`SELECT g.*, m.sesion_id FROM gastos_financieros_operativos g
    LEFT JOIN movimientos_caja_chica m ON m.id=g.movimiento_caja_id
    WHERE g.fecha_gasto BETWEEN :desde AND :hasta AND g.id> :despues
      AND (:sesion_id IS NULL OR m.sesion_id= :sesion_id) AND (:clasificacion IS NULL OR g.clasificacion= :clasificacion)
    ORDER BY g.id LIMIT :cantidad`, { replacements: { ...f, cantidad: f.limite + 1 }, type: QueryTypes.SELECT });
  const mas = filas.length > f.limite; if (mas) filas.pop();
  return { filtros: f, gastos: filas, paginacion: { limite: f.limite, siguiente: mas ? filas.at(-1).id : null } };
}
