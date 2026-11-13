import {filasActividad,celdaCsvReporte} from './reportes.js'
// Dinero a cuatro decimales, sin Number ni doble descuento de compras/pagos.
const leer=s=>{const[a,b='']=s.split('.');return BigInt(a+b.padEnd(4,'0'))}
const texto=n=>{const signo=n<0n?'-':'';n=n<0n?-n:n;return `${signo}${n/10000n}.${String(n%10000n).padStart(4,'0')}`}
export function nivelesResultado(r) {
  const g=r.gastos.por_clase
  const bruta=r.estimacion.completa?leer(r.ventas.base_registrada)-leer(r.costos.cohorte_ventas):null
  const operativa=bruta===null?null:bruta-leer(g.operativo)
  const antes=operativa===null?null:operativa-leer(g.financiero)-leer(g.extraordinario)
  // Cero registros no prueba exoneración ni régimen fiscal validado.
  const neta=antes===null||leer(g.provision_impuesto)===0n?null:antes-leer(g.provision_impuesto)
  return {bruta:bruta===null?null:texto(bruta),operativa:operativa===null?null:texto(operativa),antes_impuestos:antes===null?null:texto(antes),neta:neta===null?null:texto(neta)}
}
export function csvResultados(r) {
  const n=nivelesResultado(r)
  const filas=[['LA VENEZIANA','Estado de resultados gerencial'],['Desde',r.filtros.desde],['Hasta',r.filtros.hasta],['Moneda','PEN'],['Zona',r.filtros.zona_horaria],['Consultado',r.consultado_en],['Ventas netas registradas',r.ventas.base_registrada],['Costo histórico',r.costos.cohorte_ventas],['Utilidad bruta',n.bruta],...Object.entries(r.gastos.por_clase),['Utilidad operativa',n.operativa],['Antes de impuestos',n.antes_impuestos],['Neta tras provisión registrada',n.neta],['Advertencias',r.estimacion.advertencias.join(', ')],['Alcance','Referencial; compras pagadas no se restan nuevamente. Provisión registrada no implica validación tributaria.']]
  filas.push(...filasActividad(r))
  return '\uFEFF'+filas.map(f=>f.map(v=>celdaCsvReporte(v??'No disponible')).join(';')).join('\r\n')
}
