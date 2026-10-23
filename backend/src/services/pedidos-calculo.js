// Reglas puras compartidas por los servicios y las pruebas. Nunca usar importes
// del navegador ni aritmética binaria de Number para dinero.
export class ErrorPedido extends Error {
  constructor(codigo, detalles) { super(codigo); this.codigo = codigo; this.detalles = detalles; }
}
export const exigirPedido = (condicion, codigo = 'DATOS_INVALIDOS', detalles) => {
  if (!condicion) throw new ErrorPedido(codigo, detalles);
};
export const idEntero = n => Number.isSafeInteger(n) && n > 0 && n <= 2147483647;
export function idGrande(valor) {
  const texto = String(valor);
  exigirPedido(/^[1-9]\d{0,18}$/.test(texto) && BigInt(texto) <= 9223372036854775807n &&
    (typeof valor === 'string' || Number.isSafeInteger(valor)));
  return texto;
}
export function campos(datos, permitidos) {
  exigirPedido(datos && typeof datos === 'object' && !Array.isArray(datos) && Object.keys(datos).every(k => permitidos.includes(k)));
}
export function texto(valor = '', max = 250) {
  exigirPedido(typeof valor === 'string' && valor.length <= max * 2 &&
    ![...valor].some(c => c.codePointAt(0) === 127 || (c.codePointAt(0) < 32 && ![9, 10, 13].includes(c.codePointAt(0)))));
  const limpio = valor.normalize('NFC').trim().replace(/\s+/gu, ' ');
  exigirPedido([...limpio].length <= max);
  return limpio;
}
export function centimos(valor) {
  exigirPedido(typeof valor === 'string' && /^\d{1,10}(?:\.\d{1,2})?$/.test(valor));
  const [a, b = ''] = valor.split('.');
  return BigInt(a) * 100n + BigInt(b.padEnd(2, '0'));
}
export function dinero(n) {
  exigirPedido(typeof n === 'bigint' && n >= 0n && n <= 999999999999n, 'IMPORTE_FUERA_RANGO');
  return `${n / 100n}.${String(n % 100n).padStart(2, '0')}`;
}
export function validarLineas(lineas) {
  exigirPedido(Array.isArray(lineas) && lineas.length > 0 && lineas.length <= 100);
  return lineas.map(l => {
    campos(l, ['productoId', 'varianteId', 'modificadoresIds', 'cantidad', 'indicaciones']);
    exigirPedido(idEntero(l.productoId) && (l.varianteId == null || idEntero(l.varianteId)) &&
      Number.isSafeInteger(l.cantidad) && l.cantidad > 0 && l.cantidad <= 10000);
    const ids = l.modificadoresIds ?? [];
    exigirPedido(Array.isArray(ids) && ids.length <= 50 && ids.every(idEntero) && new Set(ids).size === ids.length);
    return { productoId: l.productoId, varianteId: l.varianteId ?? null, cantidad: l.cantidad,
      modificadoresIds: [...ids].sort((a, b) => a - b), indicaciones: texto(l.indicaciones) };
  });
}
// La tasa no tiene un valor supuesto. FINANZAS debe estar configurado antes de cobrar.
export function politicaFinanciera(config) {
  exigirPedido(config && config.igv_porcentaje != null && config.precios_incluyen_impuesto === true, 'FINANZAS_PENDIENTES');
  const porcentaje = String(config.igv_porcentaje);
  exigirPedido(/^\d{1,3}(?:\.\d{1,2})?$/.test(porcentaje), 'FINANZAS_PENDIENTES');
  const tasa = centimos(porcentaje);
  exigirPedido(tasa <= 10000n, 'FINANZAS_PENDIENTES');
  const modo = config.puntos_vip_modo ?? 'por_sol', factor = config.puntos_vip_por_sol ?? 1;
  exigirPedido(['por_sol', 'por_producto'].includes(modo) && Number.isSafeInteger(factor) && factor >= 0 && factor <= 10000, 'FINANZAS_PENDIENTES');
  return { tasa, porcentaje, modo, factor, valorPunto: config.valor_punto_pen ?? null };
}
export function desglosarImpuesto(total, tasa) {
  exigirPedido(typeof tasa === 'bigint' && tasa >= 0n && tasa <= 10000n);
  const divisor = 10000n + tasa;
  const base = (total * 10000n + divisor / 2n) / divisor;
  return { base: dinero(base), impuesto: dinero(total - base), total: dinero(total) };
}
export function validarPagos(pagos, total, politica) {
  exigirPedido(Array.isArray(pagos) && pagos.length > 0 && pagos.length <= 10);
  let suma = 0n, efectivo = 0, canje = 0;
  const filas = pagos.map(p => {
    campos(p, ['metodo_pago', 'monto_pagado', 'monto_entregado', 'referencia_operacion', 'verificado', 'puntos']);
    const metodo = p.metodo_pago, monto = centimos(p.monto_pagado);
    exigirPedido(['efectivo', 'tarjeta_debito', 'tarjeta_credito', 'yape', 'plin', 'transferencia', 'puntos_vip'].includes(metodo) && monto > 0n);
    suma += monto;
    let entregado = null, vuelto = 0n, referencia = null;
    if (metodo === 'efectivo') {
      exigirPedido(++efectivo === 1 && p.puntos === undefined && p.referencia_operacion === undefined && p.verificado === undefined);
      entregado = centimos(p.monto_entregado);
      exigirPedido(entregado >= monto);
      vuelto = entregado - monto;
    } else if (metodo === 'puntos_vip') {
      exigirPedido(canje === 0 && Number.isSafeInteger(p.puntos) && p.puntos > 0 && p.puntos <= 2147483647 && politica.valorPunto !== null &&
        p.monto_entregado === undefined && p.referencia_operacion === undefined && p.verificado === undefined, 'CANJE_NO_DISPONIBLE');
      const valor = centimos(politica.valorPunto);
      exigirPedido(valor > 0n && valor * BigInt(p.puntos) === monto, 'CANJE_NO_DISPONIBLE');
      canje = p.puntos;
    } else {
      referencia = texto(p.referencia_operacion, 100);
      exigirPedido(referencia.length >= 3 && p.verificado === true && p.monto_entregado === undefined && p.puntos === undefined, 'PAGO_SIN_VERIFICAR');
    }
    return { metodo_pago: metodo, monto_pagado: dinero(monto), monto_entregado: entregado === null ? null : dinero(entregado), vuelto: dinero(vuelto), referencia_operacion: referencia };
  });
  exigirPedido(suma === total, 'PAGOS_NO_CUADRAN');
  return { filas, canje };
}
