import { MEDIOS_REPORTE } from '../src/utils/reportes.js'
export function reporteFixture() {
  return { version_algoritmo: 1, consultado_en: '2026-11-06T18:00:00Z', filtros: { desde: '2026-11-01', hasta: '2026-11-06', estado: 'emitida', moneda: 'PEN', zona_horaria: 'America/Lima', sesion_id: null },
    ventas: { cantidad: 5, total: '100.00', base_registrada: '90.00', impuesto_registrado: '10.00', ticket_promedio: '20.00' },
    medios: Object.keys(MEDIOS_REPORTE).map(metodo => ({ metodo, cobrado: metodo === 'efectivo' ? '40.00' : metodo === 'yape' ? '60.00' : '0.00', devuelto: metodo === 'plin' ? '5.00' : '0.00', neto: metodo === 'efectivo' ? '40.00' : metodo === 'yape' ? '60.00' : metodo === 'plin' ? '-5.00' : '0.00' })),
    serie_ventas: [{ fecha: '2026-11-01', cantidad: 2, total: '40.00' }, { fecha: '2026-11-06', cantidad: 3, total: '60.00' }],
    devoluciones_periodo: '5.00', neto_comercial_periodo_incluye_impuesto: '95.00',
    gastos: { total: '14.00', sin_asignacion_sesion_en_periodo: '0.00', por_clase: { operativo: '2.00', financiero: '3.00', extraordinario: '4.00', provision_impuesto: '5.00' } },
    movimientos: { ingresos: '0.00', egresos: '64.00', egresos_sin_gasto: '50.00' }, costos: { cohorte_ventas: '10.0000', calidad: {}, salidas_periodo: [] },
    estimacion: { completa: true, advertencias: [], margen_base_menos_costo: '80.0000', resultado_tras_gastos: '66.0000' },
    politica: { ingresos: 'Fecha de emisión y estado de venta.', alcance: 'Reporte interno referencial, no cierre contable.' } }
}
