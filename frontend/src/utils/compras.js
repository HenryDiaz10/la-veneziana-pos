export const hoyCompra=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const redondear=(n,d)=>n/d+(n%d*2n>=d?1n:0n)
export const solesCompra=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`
export function escalarCompra(v,dec=4) {
  if(typeof v!=='string'||!new RegExp(`^\\d{1,10}(?:\\.\\d{1,${dec}})?$`).test(v)) throw new Error('Escribe cantidades y costos válidos con punto decimal.')
  const[e,f='']=v.split('.');const n=BigInt(e)*10n**BigInt(dec)+BigInt(f.padEnd(dec,'0'))
  if(n>999999999999n) throw new Error('El importe o la cantidad supera el límite permitido.')
  return n
}
export function resumenCompra(lineas,igv) {
  try {
    let suma=0n
    const subtotales=lineas.map(l=>{const q=escalarCompra(l.cantidad_base),c=escalarCompra(l.costo_unitario);if(q<=0n)throw new Error('Indica una cantidad positiva en cada línea.');const s=redondear(q*c,1000000n);suma+=s;return solesCompra(s)})
    const impuesto=escalarCompra(igv,2)
    if(suma+impuesto>999999999999n)throw new Error('El total supera el límite permitido.')
    return {subtotal:solesCompra(suma),igv:solesCompra(impuesto),total:solesCompra(suma+impuesto),subtotales}
  } catch(e) {return {error:e.message}}
}
