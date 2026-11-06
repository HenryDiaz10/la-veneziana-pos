// Estimaciones de pérdida durante manipulación de insumos YA limpios/listos.
// No incluyen cáscaras, huesos, evaporación ni variación aleatoria del servido.
// Las unidades enteras no se fraccionan para simular roturas de botellas/huevos.
import { insumosRecetario } from './carta-recetas.mjs';
const unidades = new Map(insumosRecetario.map(i => [i.clave, i.unidad]));
const verduras = new Set(['papa', 'lechuga', 'tomate', 'cebolla', 'zanahoria', 'repollo', 'berenjena', 'zapallito', 'espinaca', 'albahaca', 'perejil', 'choclo', 'champiñon', 'champinon', 'cebolla_china']);
const frutas = new Set(['pina', 'durazno', 'mango', 'lucuma', 'fresa', 'arandano', 'manzana', 'naranja_fruta', 'pulpa_maracuya']);
const carnes = new Set(['res', 'cerdo', 'pollo', 'carne_molida', 'pollo_molido', 'gallina_pecho', 'gallina_pierna', 'pechuga', 'pierna', 'chuleta']);
const salsas = new Set(['salsa_tomate', 'mayonesa', 'ketchup', 'mostaza', 'manjar', 'crema_coco', 'algarrobina']);
export function mermaPorInsumo(clave) {
  if (!unidades.has(clave)) throw new Error(`Insumo sin política de merma: ${clave}`);
  if (unidades.get(clave) === 'un' || ['agua', 'hielo', 'sal', 'azucar'].includes(clave)) return '0.00';
  if (verduras.has(clave) || frutas.has(clave)) return '5.00';
  if (carnes.has(clave) || salsas.has(clave)) return '3.00';
  if (unidades.get(clave) === 'l') return '1.00';
  return '2.00';
}
// Convertir neto objetivo a bruto UNA sola vez, con aritmética decimal exacta.
// Ej.: 0.2000 kg netos y 2% => 0.2041 kg brutos, no 0.2040.
export function aplicarMermaIngrediente(i) {
  const merma = mermaPorInsumo(i.insumo);
  const divisor = 10000n - BigInt(merma.replace('.', ''));
  const numerador = BigInt(i.cantidad.replace('.', '')) * 10000n;
  const bruto = (numerador + divisor / 2n) / divisor;
  return { ...i, cantidad_neta_referencia: i.cantidad, merma,
    cantidad: `${bruto / 10000n}.${String(bruto % 10000n).padStart(4, '0')}` };
}
