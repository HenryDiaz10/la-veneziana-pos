// Validar el contrato antes de dibujar o exportar datos de clientes.
export function validarAnaliticaClientes(c){
  const exigir=v=>{if(!v)throw new Error('La analítica de clientes recibida no es válida.')}
  const entero=n=>Number.isSafeInteger(n)&&n>=0
  const importe=v=>typeof v==='string'&&/^\d+\.\d{2}$/.test(v)
  exigir(c?.version===1&&c.resumen&&['dia','mes'].includes(c.granularidad)&&typeof c.alcance==='string')
  const s=c.resumen
  for(const k of ['activos','nuevos','regresaron','recurrentes','una_compra','compras_identificadas','compras_sin_cliente'])exigir(entero(s[k]))
  for(const k of ['ingreso_neto','ingreso_sin_cliente','recompra_porcentaje','identificacion_porcentaje','compras_por_cliente'])exigir(importe(s[k]))
  exigir(s.nuevos+s.regresaron===s.activos&&s.recurrentes+s.una_compra===s.activos&&Number(s.recompra_porcentaje)<=100&&Number(s.identificacion_porcentaje)<=100)
  for(const [k,limite] of [['ranking_ingresos',20],['ranking_frecuencia',10],['ranking_unidades',10]]){
    exigir(Array.isArray(c[k])&&c[k].length<=limite&&new Set(c[k].map(v=>v.id)).size===c[k].length)
    exigir(c[k].every(v=>entero(v.id)&&v.id>0&&typeof v.nombre==='string'&&entero(v.compras)&&v.compras>0&&entero(v.dias)&&typeof v.unidades==='string'&&/^\d+$/.test(v.unidades)&&importe(v.bruto)&&importe(v.devuelto)&&importe(v.neto)&&importe(v.promedio_neto)&&typeof v.nuevo==='boolean'&&Number.isFinite(Date.parse(v.primera_compra))&&Number.isFinite(Date.parse(v.ultima_compra))))
  }
  exigir(Array.isArray(c.evolucion)&&c.evolucion.length<=366&&c.evolucion.every(e=>typeof e.fecha==='string'&&/^\d{4}-\d{2}(?:-\d{2})?$/.test(e.fecha)&&entero(e.clientes)&&entero(e.compras)))
  exigir(Array.isArray(c.productos)&&c.productos.length<=10&&c.productos.every(p=>typeof p.nombre==='string'&&typeof p.unidades==='string'&&/^\d+$/.test(p.unidades)))
  return c
}
