// Cantidades y costos NETOS ficticios para abastecer el entorno local.
// No son cotizaciones, facturas fiscales ni precios acordados con proveedores.
import { insumosRecetario } from './carta-recetas.mjs';
import { productosCarta } from './carta-veneziana.mjs';
export const FECHA_COMPRAS_INICIALES='2026-11-06';
export const LOTE_COMPRAS_INICIALES='abastecimiento-inicial-20261106-v1';
const ruc={alicorp:'20100055237',sanfernando:'20100154308',lindley:'20101024645',gloria:'20100190797',makro:'20492092313',carniceria:'00000000001'};
// [cantidad en kg/l/un, costo neto S/ por unidad base]. No precios por gramo.
const porcion={
  harina:[50,3],mozzarella:[25,24],salsa_tomate:[12,6],agua:[500,0.15],levadura:[1,22],sal:[5,1.5],aceite:[30,6],oliva:[5,24],oregano:[0.5,24],
  jamon:[5,16],aceituna_verde:[3,12],aceituna_negra:[2,14],aceituna_rellena:[2,18],pepperoni:[3,24],parmesano:[3,32],pina:[8,5],durazno:[5,8],hotdog:[6,10],berenjena:[3,4],zapallito:[3,4],albahaca:[1,8],champinon:[3,16],tomate:[12,3.5],cecina:[5,28],res:[12,26],cerdo:[8,17],pollo:[12,13],chorizo:[5,16],salame:[3,23],papa:[30,3],choclo:[5,6],cebolla:[10,2.5],ajo:[2,10],sillao:[4,5],vinagre:[4,3],pimienta:[0.5,25],comino:[0.5,18],
  baguette:[40,2.5],mantequilla:[4,20],perejil:[1,6],azucar:[15,3],manteca:[3,7],leche:[15,4],evaporada:[10,7],huevo:[180,0.55],manjar:[3,10],chocolate:[3,16],pan_hamburguesa:[60,0.5],carne_molida:[6,18],pollo_molido:[6,12],cheddar:[2,23],edam:[2,23],lechuga:[5,4],papas_hilo:[3,12],mayonesa:[6,8],ketchup:[5,7],mostaza:[3,7],
  gallina_pecho:[8,18],gallina_pierna:[8,16],fideo:[8,4.5],cebolla_china:[2,5],cancha:[4,4],zanahoria:[5,2.5],repollo:[5,2.5],chuleta:[8,19],arroz:[25,3.5],platano:[6,4],kion:[1,7],sesamo:[1,20],pechuga:[10,13],pierna:[10,10],maicena:[2,5],paprika:[0.5,20],
  espinaca:[3,4],ricotta:[3,15],nuez:[1,30],nuez_moscada:[0.25,40],pulpa_maracuya:[6,8],mango:[5,6],lucuma:[5,10],fresa:[6,8],arandano:[3,16],limon:[5,8],hielo:[80,1],
  pisco:[6,28],ron:[4,24],vodka:[4,24],tequila:[3,38],triple_sec:[2,28],curacao:[2,26],granadina:[3,12],algarrobina:[2,15],clara:[2,10],huevo_liquido:[2,9],amargo:[0.5,90],ginger:[8,4],vino:[8,12],brandy:[2,25],naranja:[5,5],manzana:[4,4],naranja_fruta:[4,3],jugo_pina:[6,5],crema_coco:[3,14],gas:[6,2],corona:[24,4.5],canela:[0.5,25],clavo:[0.25,35],cafe:[2,28],infusion:[100,0.12],cacao:[1,18],maiz_morado:[4,5]
};
const sf=new Set(['jamon','hotdog','chorizo','salame','pollo','pollo_molido','huevo','pechuga','pierna','cerdo','chuleta']);
const carnes=new Set(['res','carne_molida','cecina','gallina_pecho','gallina_pierna']);
const lacteos=new Set(['leche','evaporada','mantequilla','manjar']);
const alicorp=new Set(['harina','aceite','manteca','mayonesa','ketchup','mostaza','fideo']);
export const lineasComprasIniciales=insumosRecetario.map(i=>{
  if(!porcion[i.clave])throw Error(`Falta abastecimiento: ${i.clave}`);
  const [cantidad,costo]=porcion[i.clave];
  return {codigo:i.codigo,nombre:i.nombre,unidad:i.unidad,cantidad_base:cantidad.toFixed(4),costo_unitario:costo.toFixed(4),ruc:ruc[sf.has(i.clave)?'sanfernando':carnes.has(i.clave)?'carniceria':lacteos.has(i.clave)?'gloria':alicorp.has(i.clave)?'alicorp':'makro']};
});
for(const p of productosCarta.filter(p=>p.directo)){
  const cerveza=p.clave==='TRA-CERVEZA';
  // Estimación por envase según precio de carta, sin tomarla por cotización.
  const costo=cerveza?4:Number(p.precio)*0.48;
  lineasComprasIniciales.push({codigo:p.sku,nombre:p.nombre,unidad:'un',cantidad_base:cerveza?'48.0000':'36.0000',costo_unitario:costo.toFixed(4),ruc:ruc[cerveza?'makro':'lindley']});
}
