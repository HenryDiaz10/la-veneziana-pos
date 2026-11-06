import { productosCarta, gruposCarta } from './carta-veneziana.mjs';

// Referencia operativa solicitada por el propietario, NO una formulación pesada
// en cocina. Entradas en gramos/ml/un; persistencia en kg/l/un a 4 decimales.
const catalogo = {
  harina: ['Harina de trigo', 'kg'], mozzarella: ['Queso mozzarella', 'kg'], salsa_tomate: ['Salsa de tomate lista', 'kg'], agua: ['Agua potable para preparación', 'l'], levadura: ['Levadura seca', 'kg'], sal: ['Sal', 'kg'], aceite: ['Aceite vegetal', 'l'], oliva: ['Aceite de oliva', 'l'], oregano: ['Orégano seco', 'kg'],
  jamon: ['Jamón inglés', 'kg'], aceituna_verde: ['Aceituna verde sin pepa', 'kg'], aceituna_negra: ['Aceituna negra sin pepa', 'kg'], aceituna_rellena: ['Aceituna verde rellena', 'kg'], pepperoni: ['Pepperoni', 'kg'], parmesano: ['Queso parmesano', 'kg'], pina: ['Piña limpia', 'kg'], durazno: ['Durazno sin carozo', 'kg'], hotdog: ['Hot dog de pollo', 'kg'], berenjena: ['Berenjena', 'kg'], zapallito: ['Zapallito italiano', 'kg'], albahaca: ['Albahaca fresca', 'kg'], champinon: ['Champiñones', 'kg'], tomate: ['Tomate fresco', 'kg'], cecina: ['Cecina', 'kg'], res: ['Lomo de res', 'kg'], cerdo: ['Carne de cerdo', 'kg'], pollo: ['Filete de pollo', 'kg'], chorizo: ['Chorizo', 'kg'], salame: ['Salame', 'kg'], papa: ['Papa amarilla', 'kg'], choclo: ['Choclo desgranado', 'kg'], cebolla: ['Cebolla roja', 'kg'], ajo: ['Ajo pelado', 'kg'], sillao: ['Sillao', 'l'], vinagre: ['Vinagre', 'l'], pimienta: ['Pimienta molida', 'kg'], comino: ['Comino', 'kg'],
  baguette: ['Pan baguette para 10 rebanadas', 'un'], mantequilla: ['Mantequilla', 'kg'], perejil: ['Perejil', 'kg'], azucar: ['Azúcar', 'kg'], manteca: ['Manteca vegetal', 'kg'], leche: ['Leche entera', 'l'], evaporada: ['Leche evaporada', 'l'], huevo: ['Huevo', 'un'], manjar: ['Manjar blanco', 'kg'], chocolate: ['Chocolate de repostería', 'kg'], pan_hamburguesa: ['Pan de hamburguesa', 'un'], carne_molida: ['Carne de res molida', 'kg'], pollo_molido: ['Carne de pollo molida', 'kg'], cheddar: ['Queso cheddar', 'kg'], edam: ['Queso edam', 'kg'], lechuga: ['Lechuga', 'kg'], papas_hilo: ['Papas al hilo listas', 'kg'], mayonesa: ['Mayonesa', 'kg'], ketchup: ['Kétchup', 'kg'], mostaza: ['Mostaza', 'kg'],
  gallina_pecho: ['Pecho de gallina con hueso', 'kg'], gallina_pierna: ['Pierna de gallina con hueso', 'kg'], fideo: ['Fideo seco', 'kg'], cebolla_china: ['Cebolla china', 'kg'], cancha: ['Maíz para cancha', 'kg'], zanahoria: ['Zanahoria', 'kg'], repollo: ['Repollo', 'kg'], chuleta: ['Chuleta de cerdo', 'kg'], arroz: ['Arroz crudo', 'kg'], platano: ['Plátano para freír', 'kg'], kion: ['Kion', 'kg'], sesamo: ['Aceite de ajonjolí', 'l'], pechuga: ['Pechuga de pollo con hueso', 'kg'], pierna: ['Pierna de pollo con hueso', 'kg'], maicena: ['Maicena', 'kg'], paprika: ['Paprika', 'kg'],
  espinaca: ['Espinaca', 'kg'], ricotta: ['Queso ricotta', 'kg'], nuez: ['Nuez para pesto', 'kg'], nuez_moscada: ['Nuez moscada', 'kg'], pulpa_maracuya: ['Pulpa de maracuyá', 'kg'], mango: ['Pulpa de mango', 'kg'], lucuma: ['Pulpa de lúcuma', 'kg'], fresa: ['Fresa limpia', 'kg'], arandano: ['Arándanos', 'kg'], limon: ['Jugo de limón', 'l'], chicha: ['Chicha morada preparada sin azúcar', 'l'], hielo: ['Hielo', 'kg'],
  pisco: ['Pisco', 'l'], ron: ['Ron blanco', 'l'], vodka: ['Vodka', 'l'], tequila: ['Tequila', 'l'], triple_sec: ['Triple sec', 'l'], curacao: ['Curaçao azul', 'l'], granadina: ['Jarabe de granadina', 'l'], algarrobina: ['Algarrobina', 'kg'], clara: ['Clara de huevo pasteurizada', 'l'], huevo_liquido: ['Huevo líquido pasteurizado', 'l'], amargo: ['Amargo de angostura', 'l'], ginger: ['Ginger ale para coctelería', 'l'], vino: ['Vino tinto', 'l'], brandy: ['Brandy', 'l'], naranja: ['Jugo de naranja', 'l'], manzana: ['Manzana limpia', 'kg'], naranja_fruta: ['Naranja limpia', 'kg'], jugo_pina: ['Jugo de piña', 'l'], crema_coco: ['Crema de coco', 'l'], gas: ['Agua con gas para coctelería', 'l'], corona: ['Cerveza Corona, botella para cóctel', 'un'], canela: ['Canela', 'kg'], clavo: ['Clavo de olor', 'kg'], cafe: ['Café molido', 'kg'], infusion: ['Porción de hierbas para infusión', 'un'], cacao: ['Cacao en polvo', 'kg']
};
catalogo.maiz_morado = ['Maíz morado', 'kg'];
delete catalogo.caldo_gallina;
delete catalogo.caldo_pollo;
delete catalogo.chicha;
export const insumosRecetario = Object.entries(catalogo).map(([clave, [nombre, unidad]]) => ({ clave, codigo: `REC-${clave.toUpperCase()}`, nombre, unidad }));
const unidadPorClave = Object.fromEntries(insumosRecetario.map(i => [i.clave, i.unidad]));
const copiar = r => ({ ...r });
export function combinar(...recetas) {
  const r = {};
  for (const receta of recetas) for (const [k, v] of Object.entries(receta)) r[k] = (r[k] ?? 0) + v;
  return r;
}
// Cantidades de las fórmulas se limitan a décimas de gramo/ml y fracciones
// simples de huevo; convertir a texto antes del redondeo decimal final.
function baseEscalada(valor, unidad, n = 1, d = 1) {
  const s = String(valor), [a, b = ''] = s.split('.');
  const denominador = 10n ** BigInt(b.length) * BigInt(unidad === 'un' ? 1 : 1000) * BigInt(d);
  const numerador = BigInt(a + b) * 10000n * BigInt(n);
  const q = (numerador + denominador / 2n) / denominador;
  if (!q) throw new Error(`Porción menor a precisión de inventario: ${s}`);
  return `${q / 10000n}.${String(q % 10000n).padStart(4, '0')}`;
}
function filas(r, n = 1, d = 1) {
  return Object.entries(r).sort(([a], [b]) => a.localeCompare(b)).map(([insumo, cantidad]) => {
    if (!unidadPorClave[insumo] || !Number.isFinite(cantidad) || cantidad <= 0) throw new Error(`Ingrediente no válido: ${insumo}`);
    return { insumo, cantidad: baseEscalada(cantidad, unidadPorClave[insumo], n, d) };
  });
}
const ensalada = { lechuga: 50, tomate: 70, zanahoria: 30, repollo: 30, cebolla: 20, oliva: 8, vinagre: 8, sal: 1 };
const guarnicion = { lechuga: 20, tomate: 30, zanahoria: 15, repollo: 15, vinagre: 4, aceite: 4, sal: 0.5 };
const papas = { papa: 220, aceite: 25, sal: 2 };
const arroz = { arroz: 80, agua: 160, aceite: 5, ajo: 2, sal: 1 };
const cremas = { mayonesa: 15, ketchup: 15, mostaza: 5 };
const panAjo = { baguette: 1, mantequilla: 40, ajo: 10, perejil: 2, oliva: 10 };
const panAjoLado = { baguette: 0.2, mantequilla: 8, ajo: 2, perejil: 0.4, oliva: 2 };
const salteado = { cebolla: 60, tomate: 60, sillao: 15, vinagre: 10, ajo: 3, aceite: 12, sal: 1, pimienta: 0.5 };
const broaster = { harina: 35, maicena: 15, leche: 25, huevo: 0.25, ajo: 3, paprika: 2, sal: 3, pimienta: 0.5, aceite: 25 };
const chaufa = { arroz: 90, agua: 180, huevo: 1, cebolla_china: 20, sillao: 20, ajo: 3, kion: 3, aceite: 15, sesamo: 3, sal: 1 };
const pasta = { harina: 100, huevo: 1, agua: 15, sal: 1, oliva: 5 };
const blanca = { leche: 140, mantequilla: 12, harina: 12, sal: 1, nuez_moscada: 0.2 };
const ragu = { carne_molida: 90, tomate: 100, cebolla: 30, zanahoria: 20, ajo: 3, oliva: 8, sal: 1, oregano: 0.5 };
const pizzaSabores = {
  AMERICANA: { jamon: 30, aceituna_verde: 15 }, NAPOLITANA: { pepperoni: 25, aceituna_negra: 15, tomate: 30 }, 'DUE-FORMAGGI': { jamon: 30, parmesano: 15 }, PEPPERONI: { pepperoni: 30 }, HAWAIANA: { jamon: 30, pina: 30, durazno: 25 }, CASERA: { jamon: 25, aceituna_verde: 15, hotdog: 30 }, VEGETARIANA: { berenjena: 20, zapallito: 20, albahaca: 3, aceituna_verde: 10, champinon: 25, parmesano: 10 }, '4-ESTACIONES': { aceituna_verde: 15, champinon: 25, jamon: 30 }, MARGHERITA: { albahaca: 5 }, CECINA: { cecina: 40, jamon: 20 }, LOMO: { res: 70, cebolla: 25, tomate: 25, sillao: 6, aceite: 5, ajo: 2 }, 'SUPER-ESPECIAL': { papa: 50, cerdo: 60, ajo: 2, comino: 0.5 }, MIX: { cerdo: 25, pollo: 25, res: 25, parmesano: 10 }, POLLO: { pollo: 65, aceituna_rellena: 15 }, 'GORDO-JEU': { jamon: 25, aceituna_verde: 15, hotdog: 25, cerdo: 20, pollo: 20, res: 20, champinon: 20 }, GARDELITO: { jamon: 25, pepperoni: 25, cerdo: 20, pollo: 20, res: 20, chorizo: 25 }, VENEZIANA: { papa: 40, choclo: 25, salame: 20, hotdog: 25 }, SALCHIPIZZA: { jamon: 25, cerdo: 20, pollo: 20, res: 20, papa: 100, aceite: 10 }, BORDECITOS: { pepperoni: 25, cerdo: 20, pollo: 20, res: 20 }
};
function pizzaReceta(clave, tamano) {
  const [factor, divisor, harina, mozzarella, salsa] = tamano === 'Familiar' ? [2, 1, 400, 200, 45] : tamano === 'Mediana' ? [3, 2, 300, 140, 30] : [1, 1, 200, 100, 15];
  const doble = ['GORDO-JEU', 'GARDELITO', 'SALCHIPIZZA', 'BORDECITOS'].includes(clave);
  const base = { harina, mozzarella: mozzarella * (doble ? 2 : 1) + (clave === 'BORDECITOS' ? 80 : 0), salsa_tomate: salsa, agua: harina * 0.6, levadura: harina * 0.01, sal: harina * 0.02, oliva: harina * 0.03, oregano: 0.5 };
  const ingredientes = [...filas(base), ...filas(pizzaSabores[clave], factor, divisor)];
  return ingredientes;
}
const preparadas = {
  'ADI-AJO': panAjo, 'ADI-AJO-ESPECIAL': combinar(panAjo, { mozzarella: 100, jamon: 60, aceituna_verde: 25, hotdog: 60 }),
  'PAN-CACHITOS': { harina: 60, agua: 30, azucar: 3, manteca: 6, levadura: 1.2, sal: 1 },
  'SOP-GALLINA': { agua: 700, cebolla: 20, zanahoria: 20, ajo: 3, huevo: 1, papa: 100, fideo: 50, cebolla_china: 10, cancha: 25, aceite: 4, sal: 2 },
  'SOP-MINUTA': { res: 100, agua: 550, huevo: 1, papa: 100, fideo: 60, evaporada: 60, baguette: 0.2, cebolla: 20, tomate: 30, ajo: 3, aceite: 8, sal: 2, oregano: 0.5 },
  'SOP-POLLO': { agua: 650, cebolla: 20, zanahoria: 20, ajo: 3, pollo: 120, huevo: 1, papa: 100, fideo: 50, cebolla_china: 10, baguette: 0.2, sal: 2 },
  'CRI-SALCHIPAPA': combinar(papas, guarnicion, cremas, { chorizo: 100, huevo: 1 }),
  'CRI-CHULETA': combinar(guarnicion, papas, { chuleta: 280, ajo: 4, pimienta: 0.5, comino: 0.5 }),
  'CRI-POLLO-PLANCHA': combinar(guarnicion, papas, arroz, { pollo: 180, ajo: 3, pimienta: 0.5 }),
  'CRI-BISTEC': combinar(guarnicion, papas, arroz, { res: 180, platano: 100, huevo: 1, ajo: 3, aceite: 10, pimienta: 0.5 }),
  'CRI-TALLARIN-RES': combinar(salteado, { fideo: 120, res: 150, cebolla_china: 10 }),
  'CRI-TALLARIN-POLLO': combinar(salteado, { fideo: 120, pollo: 150, cebolla_china: 10 }),
  'CRI-CHAUFA-CECINA': combinar(chaufa, { cecina: 150 }), 'CRI-CHAUFA-RES': combinar(chaufa, { res: 150 }), 'CRI-CHAUFA-POLLO': combinar(chaufa, { pollo: 150 }), 'CRI-CHAUFA-CERDO': combinar(chaufa, { cerdo: 150 }),
  'CRI-LOMO-POLLO': combinar(salteado, papas, arroz, { pollo: 160 }), 'CRI-LOMO-RES': combinar(salteado, papas, arroz, { res: 160 }),
  'CRI-BROASTER': combinar(broaster, guarnicion, papas, cremas),
  'CRI-LOMO-POBRE': combinar(salteado, papas, arroz, { res: 180, platano: 100, huevo: 1, aceite: 10 }),
  'CRI-POLLO-POBRE': combinar(salteado, papas, arroz, { pollo: 180, platano: 100, huevo: 1, aceite: 10 }),
  'CRI-MOSTRITO': combinar(broaster, guarnicion, papas, cremas, chaufa, { pechuga: 250 }),
  'ADI-PAPAS': papas, 'ADI-ENSALADA': ensalada, 'ADI-HUEVO': { huevo: 1 },
  'PAS-LASANA': combinar(pasta, ragu, blanca, panAjoLado, { espinaca: 30, mozzarella: 40, parmesano: 15 }),
  'PAS-ALFREDO': combinar(pasta, blanca, panAjoLado, { jamon: 40, pollo: 120, parmesano: 15 }),
  'PAS-PESTO': combinar(pasta, panAjoLado, { res: 150, albahaca: 25, espinaca: 30, nuez: 15, parmesano: 20, oliva: 25, ajo: 3 }),
  'PAS-TORTELLINI': combinar(pasta, ragu, blanca, panAjoLado, { ricotta: 60, carne_molida: 40, parmesano: 15 }),
  'PAS-RAVIOLES': combinar(pasta, ragu, panAjoLado, { ricotta: 80, espinaca: 50, parmesano: 15 }),
  'CAL-CAFE': { cafe: 12, agua: 200, azucar: 10 }, 'CAL-CAPUCHINO': { cafe: 12, agua: 40, leche: 150, cacao: 2, azucar: 10 },
  'CAL-INFUSION': { infusion: 1, agua: 250, azucar: 10 }, 'CAL-JARRA': { infusion: 4, agua: 1000, azucar: 40 }
};
const frozen = {
  LIMONADA: { limon: 60, agua: 220, azucar: 45, hielo: 200 }, MARACUYA: { pulpa_maracuya: 100, agua: 200, azucar: 45, hielo: 200 }, CHICHA: { maiz_morado: 50, agua: 300, pina: 30, canela: 0.5, clavo: 0.1, limon: 10, azucar: 35, hielo: 200 }, PINA: { pina: 150, agua: 160, azucar: 40, hielo: 200 }, FRESA: { fresa: 150, agua: 160, azucar: 40, hielo: 200 }, MARACUMANGO: { pulpa_maracuya: 70, mango: 100, agua: 140, azucar: 40, hielo: 200 }, LUCUMA: { lucuma: 120, leche: 150, agua: 80, azucar: 35, hielo: 180 }, ARANDANOS: { arandano: 130, agua: 180, azucar: 40, hielo: 200 }, DURAZNO: { durazno: 150, agua: 160, azucar: 40, hielo: 200 }
};
// Copa nominal estimada de 250 ml, hielo incluido; 1/2 L y 1 L escalan 2 y 4.
const tragos = {
  'MARACUYA-SOUR': { pisco: 60, pulpa_maracuya: 60, limon: 15, azucar: 25, clara: 20, hielo: 80 }, 'PISCO-SOUR': { pisco: 60, limon: 30, azucar: 25, clara: 20, amargo: 1, hielo: 80 }, ALGARROBINA: { pisco: 45, algarrobina: 25, evaporada: 80, huevo_liquido: 20, hielo: 80 }, DURAZNO: { pisco: 45, durazno: 100, evaporada: 60, azucar: 15, hielo: 80 }, CHILCANO: { pisco: 50, ginger: 120, limon: 20, amargo: 1, hielo: 80 }, 'CHILCANO-MARACUYA': { pisco: 50, pulpa_maracuya: 50, ginger: 90, limon: 15, hielo: 80 }, SANGRIA: { vino: 100, brandy: 15, naranja: 60, manzana: 30, naranja_fruta: 30, azucar: 15, hielo: 50 }, 'PINA-COLADA': { ron: 50, crema_coco: 40, jugo_pina: 90, azucar: 15, hielo: 80 }, PITUFO: { vodka: 45, curacao: 20, evaporada: 60, jugo_pina: 60, hielo: 100 }, 'LAGUNA-AZUL': { vodka: 50, curacao: 20, limon: 20, gas: 100, azucar: 15, hielo: 100 }, PANTERA: { vodka: 45, granadina: 20, evaporada: 100, jugo_pina: 40, hielo: 100 }, CALIENTITO: { pisco: 40, agua: 150, limon: 20, azucar: 20, canela: 1, clavo: 0.2 }, CORONA: { tequila: 45, triple_sec: 15, limon: 25, azucar: 15, corona: 1, hielo: 100, sal: 2 }
};
for (const [k, r] of Object.entries(frozen)) preparadas[`FRO-${k}`] = r;
for (const [k, r] of Object.entries(tragos)) preparadas[`TRA-${k}`] = r;
for (const [k, r] of Object.entries({ CLASICA: {}, ROYALE: { huevo: 1 }, 'SUPER-CLASICA': { huevo: 1 }, 'LOMO-FINO': { res: 100, huevo: 1, champinon: 40 } })) {
  preparadas[`HAM-${k}`] = combinar({ pan_hamburguesa: 1, tomate: 30, lechuga: 15 }, cremas, r,
    ['SUPER-CLASICA', 'LOMO-FINO'].includes(k) ? papas : { papas_hilo: 20 });
}
for (const peso of [50, 100]) preparadas[`PAN-MOZ-${peso}`] = { harina: peso * 0.5, agua: peso * 0.25, mozzarella: peso * 0.2, aceituna_verde: peso * 0.06, mantequilla: peso * 0.04, levadura: peso * 0.01, sal: peso * 0.008 };
for (const sabor of ['MANJAR', 'CHOCOLATE']) preparadas[`PAN-${sabor}`] = { harina: 50, leche: 10, agua: 10, huevo: 0.15, azucar: 8, mantequilla: 4, levadura: 1, sal: 0.5, [sabor === 'MANJAR' ? 'manjar' : 'chocolate']: 25 };

export const recetasCarta = [];
for (const p of productosCarta.filter(p => !p.directo)) {
  for (const variante of [null, ...(p.variantes ?? []).map(v => v.nombre)]) {
    let ingredientes;
    if (p.categoria === 'pizzas') ingredientes = pizzaReceta(p.clave.slice(4), variante ?? (p.variantes ? 'Personal' : 'Familiar'));
    else {
      let r = preparadas[p.clave];
      if (!r) throw new Error(`Falta receta para ${p.sku}`);
      r = copiar(r);
      if (p.clave === 'PAS-ALFREDO' && variante === 'De lomo') { delete r.pollo; r.res = 120; }
      const factor = variante?.startsWith('Docena') ? 12 : p.categoria === 'frozen' && variante === '1 litro' ? 2 : p.categoria === 'tragos' && variante === '1/2 litro' ? 2 : p.categoria === 'tragos' && variante === '1 litro' ? 4 : 1;
      ingredientes = filas(r, factor);
    }
    recetasCarta.push({ sku: p.sku, variante, ingredientes });
  }
}
// Las elecciones obligatorias aportan la proteína/queso: la base NO contiene
// otra proteína predeterminada que pudiera descontarse al elegir una distinta.
export const opcionesRecetario = [
  ['proteina', 'Carne', { carne_molida: 100 }], ['proteina', 'Pollo', { pollo_molido: 100 }],
  ['queso', 'Cheddar', { cheddar: 20 }], ['queso', 'Edam', { edam: 20 }],
  ['presa', 'Pechuga', { pechuga: 250 }], ['presa', 'Pierna', { pierna: 250 }],
  ['presa-gallina', 'Pecho (pechuga)', { gallina_pecho: 250 }], ['presa-gallina', 'Pierna', { gallina_pierna: 250 }],
  ['arroz', 'Con arroz', arroz], ['arroz', 'Sin arroz', {}],
  ['adicionales', 'Porción de papas fritas', papas], ['adicionales', 'Ensalada de casa', ensalada], ['adicionales', 'Huevo sancochado', { huevo: 1 }]
].map(([grupo, opcion, r]) => ({ grupo: gruposCarta[grupo].nombre, opcion, ingredientes: filas(r) }));
// Porción opcional fija; no cambia con el tamaño porque el BOM de opciones es global.
export const frutaGordo = { sku: 'CARTA-PIZ-GORDO-JEU', grupo: 'Fruta opcional de Gordo Jeu', opcion: 'Piña y durazno (porción adicional)' };
opcionesRecetario.push({ grupo: frutaGordo.grupo, opcion: frutaGordo.opcion, ingredientes: filas({ pina: 30, durazno: 25 }) });
export const referenciaRecetario = Object.freeze({ version: 1, tipo: 'referencial_estimada', queso_g: { Personal: 100, Mediana: 140, Familiar: 200 }, harina_g: { Personal: 200, Mediana: 300, Familiar: 400 }, salsa_g: { Personal: 15, Mediana: 30, Familiar: 45 }, cucharada_estimada_g: 15, copa_estimada_ml: 250, merma: 'Cantidades brutas referenciales; no volver a aplicar merma.', aclaracion: 'L se interpreta como pequeña/personal. Doble queso duplica mozzarella; Bordecitos añade 80 g familiares para el borde. Sabores/otras preparaciones son aproximaciones a validar en cocina.' });
