// Total administrativo de documentos registrados, no utilidad ni flujo bancario.
// Se incluyen compras confirmadas pendientes y pagadas; los gastos manuales se
// suman una vez. El costo consumido permanece en el estado de resultados.
export function resumenComprasGastos(reporte) {
  if(!reporte.compras)return null
  const centimos=s=>{
    if(typeof s!=='string'||!/^\d+\.\d{2}$/.test(s))throw new Error('Importe de compras o gastos inválido.')
    return BigInt(s.replace('.',''))
  }
  const compras=reporte.compras.total,otros=reporte.gastos.total,total=centimos(compras)+centimos(otros)
  return {compras,otros,total:`${total/100n}.${String(total%100n).padStart(2,'0')}`}
}
