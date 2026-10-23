import { createHash } from 'node:crypto';
import { campos, centimos, dinero, idGrande, exigirPedido as exigir } from './pedidos-calculo.js';

export const MEDIOS_CAJA = Object.freeze(['efectivo', 'yape', 'plin', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'puntos_vip', 'cortesia']);
export function dineroConSigno(n) { return n < 0n ? `-${dinero(-n)}` : dinero(n); }
export const revisionCaja = resumen => createHash('sha256').update(JSON.stringify(resumen)).digest('hex');
export function consolidarCaja({ apertura, pagos, movimientos, devoluciones }) {
  const cobrados = Object.fromEntries(MEDIOS_CAJA.map(m => [m, 0n]));
  const devueltos = { ...cobrados };
  for (const p of pagos) { exigir(MEDIOS_CAJA.includes(p.metodo_pago), 'CAJA_INCONSISTENTE'); cobrados[p.metodo_pago] += centimos(p.monto_pagado); }
  for (const d of devoluciones) { exigir(MEDIOS_CAJA.includes(d.metodo_pago), 'CAJA_INCONSISTENTE'); devueltos[d.metodo_pago] += centimos(d.monto); }
  let ingresos = 0n, egresos = 0n;
  for (const m of movimientos) {
    exigir(['ingreso', 'egreso'].includes(m.tipo), 'CAJA_INCONSISTENTE');
    if (m.tipo === 'ingreso') ingresos += centimos(m.monto); else egresos += centimos(m.monto);
  }
  const teorico = centimos(apertura) + cobrados.efectivo + ingresos - egresos - devueltos.efectivo;
  return { apertura: dinero(centimos(apertura)), ingresos: dinero(ingresos), egresos: dinero(egresos),
    cobrado_por_metodo: Object.fromEntries(MEDIOS_CAJA.map(m => [m, dinero(cobrados[m])])),
    devuelto_por_metodo: Object.fromEntries(MEDIOS_CAJA.map(m => [m, dinero(devueltos[m])])),
    neto_por_metodo: Object.fromEntries(MEDIOS_CAJA.map(m => [m, dineroConSigno(cobrados[m] - devueltos[m])])),
    teorico_efectivo: dineroConSigno(teorico) };
}
// Reparto por restos mayores, con desempate por el orden estable recibido.
// Se usa sobre capacidades RESTANTES en cada devolución: no excede ningún medio.
export function repartirEnteros(total, pesos) {
  exigir(typeof total === 'bigint' && total >= 0n && pesos.every(p => typeof p === 'bigint' && p >= 0n));
  const suma = pesos.reduce((a, b) => a + b, 0n);
  exigir(total === 0n || suma > 0n, 'DEVOLUCION_NO_DISTRIBUIBLE');
  if (!total) return pesos.map(() => 0n);
  const filas = pesos.map((p, i) => ({ i, valor: total * p / suma, resto: total * p % suma }));
  const pendientes = total - filas.reduce((a, f) => a + f.valor, 0n);
  const orden = [...filas].sort((a, b) => a.resto === b.resto ? a.i - b.i : a.resto > b.resto ? -1 : 1);
  for (let i = 0; i < Number(pendientes); i++) orden[i].valor++;
  return filas.map(f => f.valor);
}
// El importe se deriva del snapshot, jamás del precio actual ni de la petición.
export function calcularLineasDevueltas(originales, anteriores, seleccion) {
  exigir(Array.isArray(seleccion) && seleccion.length > 0 && seleccion.length <= 100);
  const ids = new Set();
  return seleccion.map(s => {
    campos(s, ['venta_detalle_id', 'cantidad']);
    const id = idGrande(s.venta_detalle_id);
    exigir(!ids.has(id) && Number.isSafeInteger(s.cantidad) && s.cantidad > 0 && s.cantidad <= 10000); ids.add(id);
    const l = originales.find(o => String(o.id) === id);
    exigir(l, 'DETALLE_NO_PERTENECE');
    const previas = anteriores.filter(a => String(a.venta_detalle_id) === id);
    const cantidadAnterior = previas.reduce((a, p) => a + p.cantidad, 0);
    const importeAnterior = previas.reduce((a, p) => a + centimos(p.importe), 0n);
    const nuevaCantidad = cantidadAnterior + s.cantidad;
    exigir(nuevaCantidad <= l.cantidad, 'DEVOLUCION_EXCEDE_VENTA');
    const total = centimos(l.total), unidades = BigInt(l.cantidad);
    const acumulado = (total * BigInt(nuevaCantidad) + unidades / 2n) / unidades;
    const importe = acumulado - importeAnterior;
    exigir(importe >= 0n, 'DEVOLUCION_INCONSISTENTE');
    return { venta_detalle_id: id, cantidad: s.cantidad, importe: dinero(importe), cantidadAnterior, nuevaCantidad };
  });
}
export function calcularPuntosDevueltos(venta, originales, anteriores, nuevas) {
  const f = venta.snapshot_fiscal_json?.fidelizacion;
  exigir(f && ['por_sol', 'por_producto'].includes(f.modo) && Number.isSafeInteger(f.puntos_ganados) && f.puntos_ganados >= 0 &&
    Number.isSafeInteger(f.puntos_canjeados) && f.puntos_canjeados >= 0, 'VENTA_SIN_SNAPSHOT');
  const pesos = originales.map(l => {
    if (f.modo === 'por_sol') return centimos(l.total);
    const p = l.snapshot_json?.puntos_recompensa;
    exigir(Number.isSafeInteger(p) && p >= 0, 'VENTA_SIN_SNAPSHOT');
    return BigInt(l.cantidad) * BigInt(p);
  });
  const asignados = repartirEnteros(BigInt(f.puntos_ganados), pesos);
  let revertidos = 0n;
  for (const n of nuevas) {
    const i = originales.findIndex(l => String(l.id) === n.venta_detalle_id);
    revertidos += asignados[i] * BigInt(n.nuevaCantidad) / BigInt(originales[i].cantidad) - asignados[i] * BigInt(n.cantidadAnterior) / BigInt(originales[i].cantidad);
  }
  const previo = anteriores.reduce((a, d) => a + centimos(d.importe), 0n);
  const nuevo = nuevas.reduce((a, d) => a + centimos(d.importe), 0n);
  const canje = BigInt(f.puntos_canjeados), total = centimos(venta.total_final_venta);
  const restaurados = canje * (previo + nuevo) / total - canje * previo / total;
  const valor = canje ? centimos(f.valor_punto_pen) : 0n;
  exigir(!canje || valor > 0n, 'VENTA_SIN_SNAPSHOT');
  return { revertidos: Number(revertidos), restaurados: Number(restaurados), importeCanje: dinero(restaurados * valor) };
}
