import { ProductoVenta, VarianteProducto, RecetaBom, InsumoAlmacen, ProductoModificador, ModificadorCatalogo, ModificadorItem, ModificadorBom } from '../models/index.js';
import { lineasComprasIniciales } from '../../data/compras-iniciales.mjs';
const decimal=s=>{const [a,b='']=String(s).split('.');return BigInt(a+b.padEnd(4,'0'));};
const moneda=n=>{const c=(n+500000n)/1000000n;return `${c/100n}.${String(c%100n).padStart(2,'0')}`;};
// Escenario conservador: venta / 1.18, insumos con IGV incluido, sin crédito
// fiscal. Es contribución antes de mano de obra/alquiler/servicios, no utilidad.
export async function verificarMargenesIniciales({transaction}={}) {
  const opts={transaction};
  const [productos,variantes,recetas,insumos,vinculos,grupos,items,deltas]=await Promise.all([
    ProductoVenta.findAll(opts),VarianteProducto.findAll(opts),RecetaBom.findAll(opts),InsumoAlmacen.findAll(opts),ProductoModificador.findAll(opts),ModificadorCatalogo.findAll(opts),ModificadorItem.findAll(opts),ModificadorBom.findAll(opts)
  ]);
  const costos=new Map(insumos.map(i=>[i.id,lineasComprasIniciales.find(l=>l.codigo===i.codigo)?.costo_unitario]));
  const costoFila=(id,cantidad)=>{const c=costos.get(id);if(!c)throw Error(`Insumo sin costo previsto: ${id}`);return decimal(cantidad)*decimal(c);};
  const resultados=[];
  for(const p of productos.filter(p=>lineasComprasIniciales.some(l=>l.codigo===p.sku)||p.sku?.startsWith('CARTA-'))) {
    const presentaciones=p.tipo_producto==='producto_directo'?[null]:[null,...variantes.filter(v=>v.producto_id===p.id)];
    for(const v of presentaciones) {
      let costo=p.tipo_producto==='producto_directo'?costoFila(p.insumo_directo_id,'1.0000'):0n;
      const filas=recetas.filter(r=>r.producto_venta_id===p.id&&r.variante_id===(v?.id??null));
      if(p.tipo_producto!=='producto_directo'&&!filas.length)throw Error(`Falta receta para verificar margen: ${p.sku}`);
      for(const r of filas)costo+=costoFila(r.insumo_id,r.cantidad_bruta_necesaria);
      let venta=decimal(p.precio_venta_base)+decimal(v?.precio_adicional??'0');
      // El peor aporte de cada grupo permite cubrir cualquier alternativa.
      // Los opcionales que reducen la contribución se incluyen; los rentables
      // se omiten. Para múltiples, acumular todas las reducciones posibles.
      for(const link of vinculos.filter(l=>l.producto_id===p.id)) {
        const g=grupos.find(g=>g.id===link.grupo_id);
        const opciones=items.filter(i=>i.grupo_id===g.id).map(i=>{
          const c=deltas.filter(d=>d.modificador_id===i.id).reduce((n,d)=>n+costoFila(d.insumo_id,d.delta_cantidad_base),0n);
          const precio=decimal(i.precio_adicional??'0');
          return {c,precio,aporte:precio*10000n*100n/118n-c*118n/100n};
        }).sort((a,b)=>a.aporte<b.aporte?-1:a.aporte>b.aporte?1:0);
        const elegidas=g.es_multiple?opciones.filter((o,n)=>o.aporte<0n||(g.es_obligatorio&&n===0)):opciones.slice(0,(g.es_obligatorio||opciones[0]?.aporte<0n)?1:0);
        for(const o of elegidas){costo+=o.c;venta+=o.precio;}
      }
      const ventaNeta=venta*10000n*100n/118n,costoIgv=costo*118n/100n,aporte=ventaNeta-costoIgv;
      if(aporte<=0n)throw Error(`Margen insuficiente con los costos propuestos: ${p.nombre}/${v?.nombre_variante??'Base'}`);
      resultados.push({sku:p.sku,producto:p.nombre,presentacion:v?.nombre_variante??'Base',venta:moneda(venta*10000n),costo_con_igv:moneda(costoIgv),aporte_conservador:moneda(aporte)});
    }
  }
  return resultados;
}
