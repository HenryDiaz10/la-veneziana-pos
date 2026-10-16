import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { decimalInventario, formatoInventario, ErrorInventario, idInsumoValido } from './inventario-calculo.js';

const SELECT = QueryTypes.SELECT;
const FILTROS = {
  todos: '1=1',
  bajo: 'i.activo = 1 AND i.stock_fisico - i.stock_reservado > 0 AND i.stock_fisico - i.stock_reservado <= i.stock_minimo_alerta',
  agotado: 'i.activo = 1 AND i.stock_fisico - i.stock_reservado <= 0',
  quiebre: 'i.quiebre_declarado = 1'
};
const BUSQUEDA = `(:busqueda = '' OR LOCATE(:busqueda, i.nombre) > 0 OR LOCATE(:busqueda, COALESCE(i.codigo, '')) > 0
  OR EXISTS (SELECT 1 FROM productos_venta p WHERE p.insumo_directo_id = i.id AND p.tipo_producto = 'producto_directo'
    AND (LOCATE(:busqueda, p.nombre) > 0 OR LOCATE(:busqueda, COALESCE(p.sku, '')) > 0 OR LOCATE(:busqueda, COALESCE(p.codigo_barras, '')) > 0)))`;
const CAMPOS = `i.id, i.codigo, i.nombre, i.activo, i.quiebre_declarado, i.stock_fisico, i.stock_reservado,
  i.stock_minimo_alerta, i.unidad_medida_id, u.nombre AS nombre_unidad, u.abreviatura AS unidad,
  CAST(i.stock_fisico - i.stock_reservado AS CHAR) AS disponible,
  (SELECT COUNT(*) FROM productos_venta p WHERE p.insumo_directo_id = i.id AND p.tipo_producto = 'producto_directo') AS productos_directos`;
const DESDE = 'FROM insumos_almacen i JOIN unidades_medida u ON u.id = i.unidad_medida_id';
const consulta = (sql, replacements, transaction) => sequelize.query(sql, { replacements, transaction, type: SELECT, logging: false });
function paginar({ pagina = 1, limite = 20 }) {
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000 || !Number.isSafeInteger(limite) || limite < 1 || limite > 50)
    throw new ErrorInventario('DATOS_INVALIDOS');
  return { pagina, limite, offset: (pagina - 1) * limite };
}
const paginacion = (p, total) => ({ pagina: p.pagina, limite: p.limite, total, totalPaginas: Math.ceil(total / p.limite) });
const leerGrande = valor => {
  const texto = String(valor);
  if (!/^\d{1,61}(?:\.\d{1,4})?$/.test(texto)) throw new Error('Agregado de inventario inválido.');
  const [entero, fraccion = ''] = texto.split('.');
  return BigInt(entero) * 10000n + BigInt(fraccion.padEnd(4, '0'));
};
const formatoConSigno = valor => `${valor < 0n ? '-' : ''}${formatoInventario(valor < 0n ? -valor : valor)}`;

function serializar(i) {
  const disponible = decimalInventario(i.stock_fisico) - decimalInventario(i.stock_reservado);
  return { ...i, activo: Boolean(i.activo), quiebre_declarado: Boolean(i.quiebre_declarado),
    disponible: formatoConSigno(disponible), productos_directos: Number(i.productos_directos),
    alerta: i.quiebre_declarado ? 'quiebre' : !i.activo ? 'inactivo' : disponible <= 0n ? 'agotado'
      : disponible <= decimalInventario(i.stock_minimo_alerta) ? 'bajo' : 'normal' };
}
// Todas las lecturas de una respuesta comparten el mismo snapshot MySQL.
// No bloquea stock, no actualiza saldos y no ejecuta correcciones silenciosas.
const lectura = operacion => sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true }, operacion);

export function listarInventario({ pagina = 1, limite = 20, busqueda = '', alerta = 'todos' } = {}) {
  const p = paginar({ pagina, limite });
  if (typeof busqueda !== 'string' || [...busqueda].length > 150 || /[\u0000-\u001f\u007f-\u009f]/.test(busqueda) || !Object.hasOwn(FILTROS, alerta))
    throw new ErrorInventario('DATOS_INVALIDOS');
  return lectura(async transaction => {
    const parametros = { ...p, busqueda: busqueda.trim() };
    const [resumen] = await consulta(`SELECT COUNT(*) AS total,
      COALESCE(SUM(${FILTROS.bajo}), 0) AS bajos, COALESCE(SUM(${FILTROS.agotado}), 0) AS agotados,
      COALESCE(SUM(i.quiebre_declarado = 1), 0) AS quiebres ${DESDE} WHERE ${BUSQUEDA}`, parametros, transaction);
    const [conteo] = await consulta(`SELECT COUNT(*) AS total ${DESDE} WHERE ${BUSQUEDA} AND ${FILTROS[alerta]}`, parametros, transaction);
    const filas = await consulta(`SELECT ${CAMPOS} ${DESDE} WHERE ${BUSQUEDA} AND ${FILTROS[alerta]}
      ORDER BY i.id ASC LIMIT :limite OFFSET :offset`, parametros, transaction);
    return { insumos: filas.map(serializar), resumen: Object.fromEntries(Object.entries(resumen).map(([k,v]) => [k, Number(v)])),
      paginacion: paginacion(p, Number(conteo.total)), consultado_en: new Date().toISOString() };
  });
}

async function detalle(id, p, transaction, producto = null) {
  const [fila] = await consulta(`SELECT ${CAMPOS} ${DESDE} WHERE i.id = :id`, { id }, transaction);
  if (!fila) throw new ErrorInventario('INSUMO_INEXISTENTE');
  const insumo = serializar(fila);
  // SUM devuelve texto decimal: no convertir importes/cantidades a Number.
  const [totales] = await consulta(`SELECT COUNT(*) AS movimientos,
    CAST(COALESCE(SUM(CASE WHEN tipo_transaccion IN ('INGRESO_COMPRA','INGRESO_AJUSTE') THEN cantidad ELSE 0 END),0) AS CHAR) AS entradas,
    CAST(COALESCE(SUM(CASE WHEN tipo_transaccion IN ('SALIDA_VENTA','SALIDA_MERMA','SALIDA_AJUSTE') THEN cantidad ELSE 0 END),0) AS CHAR) AS salidas
    FROM inventario_kardex WHERE insumo_id = :id`, { id }, transaction);
  const [reservas] = await consulta(`SELECT COUNT(*) AS cantidad_reservas,
    CAST(COALESCE(SUM(cantidad_base),0) AS CHAR) AS activas FROM reservas_insumos WHERE insumo_id = :id AND estado = 'reservada'`, { id }, transaction);
  const [ultimo] = await consulta('SELECT saldo_posterior FROM inventario_kardex WHERE insumo_id = :id ORDER BY id DESC LIMIT 1', { id }, transaction);
  const movimientos = await consulta(`SELECT CAST(id AS CHAR) AS id, tipo_transaccion, cantidad, saldo_posterior,
    costo_unitario_transaccion, referencia_documento, usuario_id, notas, fecha_movimiento
    FROM inventario_kardex WHERE insumo_id = :id ORDER BY id DESC LIMIT :limite OFFSET :offset`, { id, ...p }, transaction);
  const productos = await consulta(`SELECT id, nombre, sku, estado FROM productos_venta
    WHERE insumo_directo_id = :id AND tipo_producto = 'producto_directo' ORDER BY id ASC LIMIT 10`, { id }, transaction);
  const teorico = leerGrande(totales.entradas) - leerGrande(totales.salidas);
  const diferenciaFisico = decimalInventario(insumo.stock_fisico) - teorico;
  const diferenciaReservado = decimalInventario(insumo.stock_reservado) - leerGrande(reservas.activas);
  const diferenciaUltimo = ultimo ? decimalInventario(insumo.stock_fisico) - decimalInventario(ultimo.saldo_posterior) : null;
  return { insumo, producto, productos_directos: productos, movimientos, paginacion: paginacion(p, Number(totales.movimientos)),
    conciliacion: { entradas: totales.entradas, salidas: totales.salidas, fisico_segun_movimientos: formatoConSigno(teorico),
      reservas_activas: reservas.activas, cantidad_reservas: Number(reservas.cantidad_reservas),
      diferencia_fisico: formatoConSigno(diferenciaFisico), diferencia_reservado: formatoConSigno(diferenciaReservado),
      ultimo_saldo_kardex: ultimo?.saldo_posterior ?? null, diferencia_ultimo_saldo: diferenciaUltimo === null ? null : formatoConSigno(diferenciaUltimo),
      coincide: diferenciaFisico === 0n && diferenciaReservado === 0n && (diferenciaUltimo === null || diferenciaUltimo === 0n),
      supuesto: 'Saldo inicial cero. Toda apertura o corrección debe tener su movimiento de Kardex.' }, consultado_en: new Date().toISOString() };
}
export function consultarInventario(id, opciones = {}) {
  if (!idInsumoValido(id)) throw new ErrorInventario('DATOS_INVALIDOS');
  const p = paginar(opciones);
  return lectura(transaction => detalle(id, p, transaction));
}
export function consultarInventarioProducto(id, opciones = {}) {
  if (!idInsumoValido(id)) throw new ErrorInventario('DATOS_INVALIDOS');
  const p = paginar(opciones);
  return lectura(async transaction => {
    const [producto] = await consulta(`SELECT id, nombre, sku, tipo_producto, insumo_directo_id FROM productos_venta WHERE id = :id`, { id }, transaction);
    if (!producto) throw new ErrorInventario('PRODUCTO_INEXISTENTE');
    if (producto.tipo_producto !== 'producto_directo' || !producto.insumo_directo_id) throw new ErrorInventario('PRODUCTO_NO_DIRECTO');
    return detalle(producto.insumo_directo_id, p, transaction, producto);
  });
}
