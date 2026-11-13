import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { filtrosReporte, CLASES_GASTO, decimalReporte as valor, formatoReporte as formato } from './reportes-reglas.js';
import { MEDIOS_CAJA } from './caja-calculo.js';
import { analiticaGerencial } from './reportes-analitica.js';
import {actividadFinanciera} from './reportes-actividad.js';

export function consultarGerencial(query, padre) {
  const f = filtrosReporte(query);
  return sequelize.transaction(padre ? { transaction: padre } : { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
    const leer = sql => sequelize.query(sql, { replacements: f, type: QueryTypes.SELECT, transaction });
    const estado = "(:estado = 'todos' OR v.estado_emision= :estado)";
    const atencion=`EXISTS(SELECT 1 FROM pedidos_master pa WHERE pa.id=v.pedido_id AND (:canal = 'todos' OR pa.tipo_atencion= :canal) AND (:mesero_id IS NULL OR pa.usuario_creador_id= :mesero_id))`;
    const ventas = `v.fecha_emision>= :inicio AND v.fecha_emision< :fin AND ${estado} AND (:sesion_id IS NULL OR v.sesion_caja_id= :sesion_id) AND ${atencion}`;
    // Agregar cabeceras SIN unir pagos/detalles: una venta mixta cuenta una vez.
    const [v] = await leer(`SELECT COUNT(*) cantidad, COALESCE(SUM(v.total_final_venta),0) total,
      COALESCE(SUM(v.subtotal_gravado),0) base, COALESCE(SUM(v.igv_total),0) impuesto FROM ventas_comprobantes v WHERE ${ventas}`);
    const serie = await leer(`SELECT DATE(CONVERT_TZ(v.fecha_emision,'+00:00',:offset)) fecha, COUNT(*) cantidad,
      SUM(v.total_final_venta) total FROM ventas_comprobantes v WHERE ${ventas} GROUP BY fecha ORDER BY fecha`);
    const pagos = await leer(`SELECT p.metodo_pago, SUM(p.monto_pagado) monto FROM ventas_pagos_split p
      JOIN ventas_comprobantes v ON v.id=p.venta_id WHERE ${ventas} GROUP BY p.metodo_pago`);
    // Desembolsos por su fecha y sesión, incluso si la venta original es antigua.
    const devoluciones = await leer(`SELECT p.metodo_pago, SUM(p.monto) monto FROM devoluciones_pagos p
      JOIN ventas_devoluciones d ON d.id=p.devolucion_id JOIN ventas_comprobantes v ON v.id=d.venta_id
      WHERE d.creado_en>= :inicio AND d.creado_en< :fin AND ${estado} AND ${atencion}
        AND (:sesion_id IS NULL OR p.sesion_id= :sesion_id) GROUP BY p.metodo_pago`);
    const gastos = await leer(`SELECT g.clasificacion, SUM(g.monto_gasto) monto FROM gastos_financieros_operativos g
      LEFT JOIN movimientos_caja_chica m ON m.id=g.movimiento_caja_id
      WHERE g.fecha_gasto BETWEEN :desde AND :hasta AND (:sesion_id IS NULL OR m.sesion_id= :sesion_id) GROUP BY g.clasificacion`);
    const [noAsignados] = await leer(`SELECT COALESCE(SUM(g.monto_gasto),0) monto FROM gastos_financieros_operativos g
      WHERE g.fecha_gasto BETWEEN :desde AND :hasta AND g.movimiento_caja_id IS NULL`);
    // Situación actual de documentos emitidos en el rango, a nivel global.
    // No inferir importes abonados a partir del estado pagado_parcial.
    const [compras] = await leer(`SELECT COUNT(*) cantidad, COALESCE(SUM(total),0) total,
      COALESCE(SUM(IF(estado_pago='pagado_total',total,0)),0) saldadas,
      COALESCE(SUM(IF(estado_pago='pendiente',total,0)),0) pendientes,
      COALESCE(SUM(estado_pago='pagado_parcial'),0) parciales,
      COALESCE(SUM(IF(estado_pago='pagado_parcial',total,0)),0) total_parciales
      FROM compras_facturas WHERE estado_registro='confirmada'
      AND estado_pago IN ('pendiente','pagado_parcial','pagado_total')
      AND fecha_emision BETWEEN :desde AND :hasta`);
    const [caja] = await leer(`SELECT COALESCE(SUM(IF(m.tipo='ingreso',m.monto,0)),0) ingresos,
      COALESCE(SUM(IF(m.tipo='egreso',m.monto,0)),0) egresos,
      COALESCE(SUM(IF(m.tipo='egreso' AND NOT EXISTS(SELECT 1 FROM gastos_financieros_operativos g WHERE g.movimiento_caja_id=m.id),m.monto,0)),0) egresos_sin_gasto
      FROM movimientos_caja_chica m WHERE m.fecha_hora>= :inicio AND m.fecha_hora< :fin AND (:sesion_id IS NULL OR m.sesion_id= :sesion_id)`);
    // Costo histórico atribuido a la cohorte de ventas, a fecha de consulta.
    // No recalcular una receta ni usar costo_promedio actual del insumo.
    const [c] = await leer(`SELECT COALESCE(SUM(IF(r.estado='consumida',r.costo_total_snapshot,0)),0) costo,
      COALESCE(SUM(r.estado='reservada'),0) reservas_pendientes,
      COALESCE(SUM(r.estado='consumida' AND (r.costo_total_snapshot IS NULL OR r.kardex_id IS NULL)),0) consumos_sin_costo,
      COUNT(DISTINCT IF(t.id IS NULL,i.id,NULL)) lineas_sin_tarea,
      COUNT(DISTINCT IF(t.id IS NOT NULL AND r.id IS NULL,t.id,NULL)) tareas_sin_reserva,
      COUNT(DISTINCT IF(t.estado='cancelado',t.id,NULL)) tareas_canceladas
      FROM ventas_comprobantes v JOIN pedido_items_kds i ON i.pedido_id=v.pedido_id
      LEFT JOIN kds_tareas t ON t.pedido_item_id=i.id LEFT JOIN reservas_insumos r ON r.tarea_id=t.id WHERE ${ventas}`);
    const [devCohorte] = await leer(`SELECT COUNT(*) cantidad FROM ventas_devoluciones d JOIN ventas_comprobantes v ON v.id=d.venta_id WHERE ${ventas}`);
    const [sinLineas] = await leer(`SELECT COUNT(*) cantidad FROM ventas_comprobantes v WHERE ${ventas}
      AND NOT EXISTS(SELECT 1 FROM pedido_items_kds i WHERE i.pedido_id=v.pedido_id)`);
    // Salidas físicas del periodo separadas del margen de la cohorte. Una tarea
    // no cobrada puede consumir; un cobro no produce por sí mismo otra salida.
    const salidas = await leer(`SELECT k.tipo_transaccion, COALESCE(SUM(ROUND(k.cantidad*k.costo_unitario_transaccion,4)),0) costo,
      COALESCE(SUM(k.costo_unitario_transaccion IS NULL),0) sin_costo FROM inventario_kardex k
      WHERE k.fecha_movimiento>= :inicio AND k.fecha_movimiento< :fin
        AND k.tipo_transaccion IN ('SALIDA_VENTA','SALIDA_MERMA','SALIDA_AJUSTE')
        AND (:sesion_id IS NULL OR EXISTS(SELECT 1 FROM reservas_insumos r JOIN kds_tareas t ON t.id=r.tarea_id
          JOIN pedido_items_kds i ON i.id=t.pedido_item_id JOIN ventas_comprobantes v ON v.pedido_id=i.pedido_id
          WHERE r.kardex_id=k.id AND v.sesion_caja_id= :sesion_id AND ${estado})) GROUP BY k.tipo_transaccion`);
    const gastosPorClase = Object.fromEntries(CLASES_GASTO.map(k => [k, formato(valor(gastos.find(g => g.clasificacion === k)?.monto))]));
    const medios = MEDIOS_CAJA.map(metodo => {
      const cobrado = valor(pagos.find(p => p.metodo_pago === metodo)?.monto), devuelto = valor(devoluciones.find(p => p.metodo_pago === metodo)?.monto);
      return { metodo, cobrado: formato(cobrado), devuelto: formato(devuelto), neto: formato(cobrado - devuelto) };
    });
    const advertencias = [];
    for (const campo of ['reservas_pendientes', 'consumos_sin_costo', 'lineas_sin_tarea', 'tareas_sin_reserva', 'tareas_canceladas']) if (Number(c[campo]) > 0) advertencias.push(campo);
    if (Number(devCohorte.cantidad)) advertencias.push('devoluciones_sin_desglose_impuesto');
    if (Number(sinLineas.cantidad)) advertencias.push('ventas_sin_lineas');
    if (f.estado !== 'emitida') advertencias.push('seleccion_incluye_estados_no_emitidos');
    if (f.sesion_id && valor(noAsignados.monto) > 0n) advertencias.push('gastos_globales_no_asignados_a_sesion');
    const margen = valor(v.base) * 100n - valor(c.costo, 4);
    const totalGastos = Object.values(gastosPorClase).reduce((a, x) => a + valor(x), 0n);
    const cobrados = medios.reduce((a, m) => a + valor(m.cobrado), 0n);
    const analitica=await analiticaGerencial(leer,ventas);
    const actividad_financiera=await actividadFinanciera(leer);
    if (cobrados !== valor(v.total)) advertencias.push('pagos_no_concilian_con_ventas');
    return { version_algoritmo: 1, consultado_en: new Date().toISOString(), filtros: f, analitica, actividad_financiera,
      politica: { ingresos: 'fecha_emision y estado de venta; pagos aplicados, no efectivo recibido',
        devoluciones: 'fecha del desembolso, sesion que lo realiza, estado de venta original',
        costos_cohorte: 'snapshots de reservas consumidas de las ventas seleccionadas a fecha de consulta',
        gastos: 'fecha_gasto civil; sesion solo cuando existe movimiento vinculado',
        compras: 'documentos confirmados por fecha de emision; estado de pago actual, global sin filtro de sesion/estado de venta; no flujo bancario ni nuevo gasto',
        capital: 'amortizacion de principal no es gasto: egreso separado sin clasificar como interes/comision',
        alcance: 'reporte interno referencial; no cierre contable ni declaracion tributaria' },
      ventas: { cantidad: Number(v.cantidad), total: formato(valor(v.total)), base_registrada: formato(valor(v.base)), impuesto_registrado: formato(valor(v.impuesto)),
        ticket_promedio: formato(Number(v.cantidad) ? (valor(v.total) + BigInt(v.cantidad) / 2n) / BigInt(v.cantidad) : 0n) },
      medios, serie_ventas: serie.map(s => ({ fecha: s.fecha, cantidad: Number(s.cantidad), total: formato(valor(s.total)) })),
      devoluciones_periodo: formato(medios.reduce((a, m) => a + valor(m.devuelto), 0n)),
      neto_comercial_periodo_incluye_impuesto: formato(valor(v.total) - medios.reduce((a, m) => a + valor(m.devuelto), 0n)),
      gastos: { por_clase: gastosPorClase, total: formato(totalGastos), sin_asignacion_sesion_en_periodo: formato(valor(noAsignados.monto)) },
      compras: { cantidad: Number(compras.cantidad), total: formato(valor(compras.total)), saldadas: formato(valor(compras.saldadas)), pendientes_sin_abonos: formato(valor(compras.pendientes)), parciales: Number(compras.parciales), total_documentos_parciales: formato(valor(compras.total_parciales)), saldo_pendiente: Number(compras.parciales) ? null : formato(valor(compras.pendientes)) },
      movimientos: { ingresos: formato(valor(caja.ingresos)), egresos: formato(valor(caja.egresos)), egresos_sin_gasto: formato(valor(caja.egresos_sin_gasto)) },
      costos: { cohorte_ventas: formato(valor(c.costo, 4), 4), calidad: c,
        salidas_periodo: salidas.map(s => ({ tipo: s.tipo_transaccion, costo: formato(valor(s.costo, 4), 4), sin_costo: Number(s.sin_costo) })) },
      estimacion: { completa: !advertencias.length, advertencias,
        alcance: 'cohorte de ventas seleccionadas menos su costo conocido y gastos del periodo; no equivale al flujo de caja',
        margen_base_menos_costo: advertencias.length ? null : formato(margen, 4),
        resultado_tras_gastos: advertencias.length ? null : formato(margen - totalGastos * 100n, 4) } };
  });
}
