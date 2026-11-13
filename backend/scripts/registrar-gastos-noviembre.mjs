// Gastos persistentes autorizados por el propietario para visualizar resultados.
// Los importes se generan por solicitud; su origen queda en auditoría y en el
// archivo técnico. No se inventan recibos ni se acredita un pago bancario/físico.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {env} from '../src/config/env.js';
import {sequelize} from '../src/config/database.js';
import * as m from '../src/models/index.js';
import {registrarCategoriaGasto,registrarGasto} from '../src/services/gastos.service.js';
import {consultarGerencial} from '../src/services/reportes.service.js';
import {auditoriaComercial} from '../src/services/operacion-comercial.js';
import {centimos,dinero,politicaFinanciera} from '../src/services/pedidos-calculo.js';
import {decimalReporte} from '../src/services/reportes-reglas.js';

const LOTE='gastos-operativos-20261113',fecha=new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});
assert.ok(env.entorno!=='production'&&['127.0.0.1','localhost','::1'].includes(env.database.host),'Solo MySQL local de desarrollo.');
try{
 const roles=await m.Rol.findAll({raw:true});
 const usuarios=await m.Usuario.findAll({where:{estado:'activo'},attributes:['id','nombre_completo','rol_id'],raw:true});
 const rol=u=>roles.find(r=>r.id===u.rol_id)?.nombre,admin=usuarios.find(u=>rol(u)==='administrador');assert.ok(admin);
 const personal=usuarios.filter(u=>['mesero','cajero','cocinero'].includes(rol(u))).sort((a,b)=>a.id-b.id);
 const plan=[
   {categoria:'Servicios básicos',descripcion:'Servicio de agua - noviembre',monto:'180.00'},
   {categoria:'Servicios básicos',descripcion:'Servicio de electricidad - noviembre',monto:'480.00'},
   ...personal.map(u=>({categoria:'Remuneraciones',descripcion:`Remuneración parcial de noviembre - ${u.nombre_completo}`,monto:{mesero:'650.00',cocinero:'900.00',cajero:'700.00'}[rol(u)]})),
   {categoria:'Internet y comunicaciones',descripcion:'Servicio de internet - noviembre',monto:'99.90'},
   {categoria:'Mantenimiento',descripcion:'Servicio de mantenimiento preventivo de cocina',monto:'120.00'},
   {categoria:'Limpieza',descripcion:'Servicio de limpieza del local',monto:'85.00'}
 ];
 const total=dinero(plan.reduce((s,p)=>s+centimos(p.monto),0n));
 console.log(JSON.stringify({fecha,igv:politicaFinanciera((await m.ConfiguracionGlobal.findByPk('FINANZAS')).valor_json).porcentaje,plan,total},null,2));
 if(process.argv.includes('--aplicar')){
   const previa=await m.IdempotenciaOperacion.findOne({where:{usuario_id:admin.id,tipo_operacion:'gasto.registrar',clave:`${LOTE}-0`}});
   if(previa){console.log('Lote ya registrado: no se añaden gastos duplicados.');}
   else{
     const filtros={desde:fecha,hasta:fecha},antes=await consultarGerencial(filtros),tx=await sequelize.transaction();
     let gastos;
     try{
       const ctx=clave=>({usuarioId:admin.id,clave,transaction:tx});
       const categorias=new Map();
       for(const [n,nombre] of [...new Set(plan.map(p=>p.categoria))].entries()){
         let c=await m.CategoriaGastoFijo.findOne({where:{nombre},transaction:tx});
         // No inferir deducibilidad tributaria a falta de documentación.
         if(!c)c=(await registrarCategoriaGasto({nombre,es_deducible_impuestos:false},ctx(`${LOTE}-cat-${n}`))).categoria;
         categorias.set(nombre,c.id);
       }
       gastos=[];
       for(const [i,p] of plan.entries()){
         const {gasto}=await registrarGasto({categoria_id:categorias.get(p.categoria),descripcion:p.descripcion,monto_gasto:p.monto,
           fecha_gasto:fecha,clasificacion:'operativo'},ctx(`${LOTE}-${i}`));
         gastos.push(gasto);
       }
       await auditoriaComercial(admin.id,'gastos_financieros_operativos',null,{lote:LOTE,origen:'Importes generados para demostración a solicitud del propietario.',fecha,total,
         gastos:gastos.map(g=>g.id),documentacion_fiscal_aportada:false,desembolso_verificado:false},tx);
       await tx.commit();
     }catch(e){await tx.rollback();throw e;}
     const despues=await consultarGerencial(filtros);
     assert.equal(centimos(despues.gastos.total)-centimos(antes.gastos.total),centimos(total));
     assert.equal(centimos(despues.gastos.por_clase.operativo)-centimos(antes.gastos.por_clase.operativo),centimos(total));
     assert.equal(despues.movimientos.egresos,antes.movimientos.egresos,'Registrar un gasto no debe inventar salidas físicas de caja.');
     if(antes.estimacion.completa&&despues.estimacion.completa)assert.equal(decimalReporte(antes.estimacion.resultado_tras_gastos,4)-decimalReporte(despues.estimacion.resultado_tras_gastos,4),centimos(total)*100n);
     const salida={lote:LOTE,origen:'Importes generados a solicitud del propietario para visualizar el estado de resultados.',fecha,total,cantidad:gastos.length,gastos,
       verificacion:{gastos_antes:antes.gastos,gastos_despues:despues.gastos,resultado_antes:antes.estimacion,resultado_despues:despues.estimacion,caja_sin_cambios:true},igv_porcentaje:'18'};
     const carpeta=new URL('../../../DOCUMENTACION/REGISTROS/',import.meta.url);await mkdir(carpeta,{recursive:true});
     await writeFile(new URL(`${LOTE}.json`,carpeta),JSON.stringify(salida,null,2)+'\n');
     console.log(JSON.stringify({guardados:gastos.length,total,gastos:despues.gastos,resultado:despues.estimacion},null,2));
   }
 }
}finally{await sequelize.close();}
