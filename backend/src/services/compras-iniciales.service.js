import { createHash } from 'node:crypto';
import { sequelize } from '../config/database.js';
import { Rol, Usuario, InsumoAlmacen, UnidadMedida, ProveedorMaestro, CompraFactura, AuditLog, ConfiguracionGlobal } from '../models/index.js';
import { guardarCompra, confirmarCompra } from './compras.service.js';
import { validarCompra } from '../validators/compras.js';
import { lineasComprasIniciales, FECHA_COMPRAS_INICIALES, LOTE_COMPRAS_INICIALES } from '../../data/compras-iniciales.mjs';
const KEY='COMPRAS_ABASTECIMIENTO_INICIAL_V1';
const exigir=(c,m)=>{if(!c)throw Error(m);};
const dinero=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;

// UID determinista: repetir la herramienta nunca vuelve a ingresar existencias.
export function uidCompraInicial(ruc) {
  const h=createHash('sha256').update(`${LOTE_COMPRAS_INICIALES}:${ruc}`).digest('hex');
  return `compra:${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}
export function construirDocumentosIniciales(insumos,proveedores) {
  const porCodigo=new Map(insumos.map(i=>[i.codigo,i]));
  exigir(new Set(lineasComprasIniciales.map(l=>l.codigo)).size===lineasComprasIniciales.length,'Insumos repetidos en el abastecimiento.');
  exigir(insumos.length===lineasComprasIniciales.length&&insumos.every(i=>lineasComprasIniciales.some(l=>l.codigo===i.codigo)),'La cobertura debe coincidir con todos los insumos activos; revisar insumos adicionales.');
  const grupos=new Map();
  for(const l of lineasComprasIniciales) {
    const i=porCodigo.get(l.codigo);
    exigir(i?.unidad===l.unidad,`Unidad distinta o insumo faltante: ${l.codigo}`);
    if(!grupos.has(l.ruc))grupos.set(l.ruc,[]);
    grupos.get(l.ruc).push({insumo_id:i.id,cantidad_base:l.cantidad_base,costo_unitario:l.costo_unitario});
  }
  return [...grupos].sort(([a],[b])=>a.localeCompare(b)).map(([ruc,lineas],indice)=>{
    const p=proveedores.find(p=>p.ruc===ruc);
    exigir(p?.estado==='activo',`Proveedor no disponible: ${ruc}`);
    const datos={proveedor_id:p.id,numero_factura:`CI-20261106-${String(indice+1).padStart(3,'0')}`,fecha_emision:FECHA_COMPRAS_INICIALES,fecha_vencimiento:null,igv:'0.00',lineas,operacion_uid:uidCompraInicial(ruc)};
    const base=validarCompra(datos);
    // 18% sobre subtotal neto; redondeo único por documento a céntimos.
    const centimos=BigInt(base.subtotal.replace('.',''));
    datos.igv=dinero((centimos*18n+50n)/100n);
    const calculada=validarCompra(datos);
    return {datos,calculada,ruc,proveedor:p.razon_social};
  });
}
export function cargarComprasIniciales({aplicar=false,transaction:padre}={}) {
  return sequelize.transaction(padre?{transaction:padre}:{},async transaction=>{
    const rol=await Rol.findOne({where:{nombre:'administrador'},transaction,lock:transaction.LOCK.UPDATE});
    const actores=rol?await Usuario.findAll({where:{rol_id:rol.id,estado:'activo'},attributes:['id'],transaction}):[];
    exigir(actores.length===1,'Se requiere exactamente un administrador activo para atribuir la carga.');
    const actor=actores[0].id;
    const unidades=await UnidadMedida.findAll({transaction});
    const insumos=(await InsumoAlmacen.findAll({where:{activo:true},attributes:['id','codigo','nombre','unidad_medida_id'],transaction})).map(i=>({...i.toJSON(),unidad:unidades.find(u=>u.id===i.unidad_medida_id)?.abreviatura.toLowerCase()}));
    const proveedores=await ProveedorMaestro.findAll({transaction});
    const documentos=construirDocumentosIniciales(insumos,proveedores);
    const firma=createHash('sha256').update(JSON.stringify(documentos.map(d=>d.datos))).digest('hex');
    const anterior=await ConfiguracionGlobal.findByPk(KEY,{transaction});
    exigir(!anterior||anterior.valor_json.huella===firma,'El lote ya existe con otros datos; no se modificó.');
    let creadas=0;
    for(const d of documentos) {
      const existente=await CompraFactura.findOne({where:{operacion_uid:d.datos.operacion_uid},transaction});
      exigir(!anterior||existente?.estado_registro==='confirmada','Lote previo incompleto/compensado: revisar manualmente.');
      if(aplicar) {
        const {compra}=await guardarCompra(null,d.datos,actor,{transaction});
        await confirmarCompra(compra.id,{revision:compra.revision},actor,{transaction});
        if(!existente)creadas++;
      }
    }
    if(aplicar&&!anterior) {
      await ConfiguracionGlobal.create({parametro_key:KEY,descripcion:'Abastecimiento local con cantidades/costos estimados y numeración interna autorizada.',valor_json:{huella:firma,lote:LOTE_COMPRAS_INICIALES,origen:'cantidades_y_costos_estimados_por_solicitud',fecha:FECHA_COMPRAS_INICIALES,igv_porcentaje:18,documentos:documentos.map(d=>d.datos.numero_factura)}},{transaction});
      await AuditLog.create({usuario_id:actor,entidad_afectada:'compras_abastecimiento_inicial',tipo_evento:'INSERT',descripcion:'Carga autorizada con costos/cantidades estimados. Numeración interna; sin facturas externas aportadas. IGV solicitado 18%.',datos_nuevos:{huella:firma,insumos:insumos.length,documentos:documentos.length}},{transaction});
    }
    return {aplicado:aplicar,fecha:FECHA_COMPRAS_INICIALES,insumos:insumos.length,creadas,documentos:documentos.map(d=>({numero:d.datos.numero_factura,proveedor:d.proveedor,lineas:d.datos.lineas.length,subtotal:d.calculada.subtotal,igv:d.calculada.igv,total:d.calculada.total}))};
  });
}
