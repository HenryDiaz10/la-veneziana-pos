// Transcripción revisada visualmente de DOCUMENTACION/CARTA/VENEZIANA CARTA.pdf.
// Importes totales de cada presentación, siempre expresados como texto decimal.
export const categoriasCarta = [
  ['pizzas', 'Pizzas', '#C94132', true], ['adicionales', 'Adicionales', '#B77906', true],
  ['panes', 'Panes', '#A66A35', true], ['hamburguesas', 'Hamburguesas', '#D97706', true],
  ['sopas', 'Sopas', '#9A5B35', true], ['criollos', 'Platos criollos', '#547A37', true],
  ['pastas', 'Pastas', '#A83D35', true], ['frozen', 'Frozen', '#9F4073', true],
  ['tragos', 'Tragos y cervezas', '#7357A4', false], ['frias', 'Bebidas frías', '#277899', false],
  ['calientes', 'Bebidas calientes', '#8A5A3C', true]
].map(([clave, nombre, color, cocina], orden) => ({ clave, nombre, color, cocina, orden: orden + 1 }));

const productos = [];
const dinero = n => Number(n).toFixed(2); // Solo formatea constantes enteras/medias; los cálculos usan céntimos.
function agregar(clave, nombre, categoria, precio, descripcion, imagen, pagina, extra = {}) {
  productos.push({ clave, sku: `CARTA-${clave.toUpperCase()}`, nombre, categoria,
    precio: dinero(precio), descripcion, imagen, pagina, ...extra });
}
function pizza(clave, nombre, descripcion, precios, pagina, imagen = 'pizza') {
  agregar(`PIZ-${clave}`, `Pizza ${nombre}`, 'pizzas', precios[0], descripcion, imagen, pagina, {
    variantes: ['Personal', 'Mediana', 'Familiar'].map((nombre, i) => ({ nombre, precio: dinero(precios[i]) }))
  });
}
// Páginas 1 a 3. Cecina familiar S/41 confirmado expresamente por el propietario.
for (const [clave, nombre, descripcion, imagen] of [
  ['AMERICANA', 'americana', 'Salsa de tomate, jamón inglés, aceitunas verdes y mozzarella.', 'pizza'],
  ['NAPOLITANA', 'napolitana', 'Salsa de tomate, pepperoni, aceitunas negras, tomates frescos y mozzarella.', 'pizza'],
  ['DUE-FORMAGGI', 'due formaggi', 'Salsa de tomate, jamón inglés, mozzarella y queso parmesano.', 'margarita'],
  ['PEPPERONI', 'pepperoni', 'Salsa de tomate, pepperoni y mozzarella.', 'pizza'],
  ['HAWAIANA', 'hawaiana', 'Salsa de tomate, jamón inglés, piña, durazno y mozzarella.', 'hawaiana'],
  ['CASERA', 'casera', 'Salsa de tomate, jamón inglés, aceitunas verdes, hot dog de pollo y mozzarella.', 'pizza'],
  ['VEGETARIANA', 'vegetariana', 'Salsa de tomate, berenjena, zapallito italiano, albahaca, aceitunas negras o verdes, mozzarella, champiñones y queso parmesano.', 'margarita'],
  ['4-ESTACIONES', '4 estaciones', 'Salsa de tomate, aceitunas verdes, champiñones, jamón inglés y mozzarella.', 'pizza']
]) pizza(clave, nombre, descripcion, [18, 28, 37], 1, imagen);
pizza('MARGHERITA', 'margherita', 'Salsa de tomate, albahaca y mozzarella.', [17, 25, 35], 2, 'margarita');
pizza('CECINA', 'súper especial de cecina', 'Salsa de tomate, carne de cecina, jamón y mozzarella.', [21, 32, 41], 2);
pizza('LOMO', 'de lomo saltado', 'Salsa de tomate, lomo saltado y mozzarella.', [19, 30, 40], 2);
pizza('SUPER-ESPECIAL', 'Veneziana súper especial', 'Salsa de tomate, papa amarilla, carne de cerdo especial y mozzarella.', [19, 30, 40], 2);
pizza('MIX', 'mix Veneziana', 'Salsa de tomate, carne de cerdo especial, carne de pollo, carne de res, mozzarella y queso parmesano.', [19, 30, 40], 2);
pizza('POLLO', 'Veneziana de pollo', 'Salsa de tomate, carne de pollo especial, aceitunas verdes rellenas y mozzarella.', [19, 30, 40], 2);
pizza('GORDO-JEU', 'Gordo Jeu', 'Salsa de tomate, jamón inglés, aceitunas verdes, hot dog, carnes mixtas, champiñones y doble queso. Opcional: piña y durazno.', [30, 41, 51], 3);
pizza('GARDELITO', 'Gardelito Flow', 'Salsa de tomate, jamón inglés, pepperoni, carne mix, chorizo y doble queso.', [30, 41, 51], 3);
pizza('VENEZIANA', 'Veneziana', 'Salsa de tomate, papa amarilla, choclo, salame, hot dog y mozzarella.', [18, 28, 38], 3);
agregar('PIZ-SALCHIPIZZA', 'La Salchipizza', 'pizzas', 55, 'Familiar. Salsa de tomate, jamón, carnes, doble queso y papas fritas encima.', 'pizza', 3);
agregar('PIZ-BORDECITOS', 'Bordecitos de Ternura Veneziana', 'pizzas', 55, 'Familiar. Salsa de tomate, pepperoni, carnes, doble queso y bordes con queso mozzarella.', 'pizza', 3);

// Página 4: paquetes y docenas se conservan como presentaciones, no como precios unitarios inventados.
agregar('ADI-AJO', 'Porción de pan al ajo', 'adicionales', 9, 'Porción de 10 unidades.', 'ajo', 4);
agregar('ADI-AJO-ESPECIAL', 'Porción de pan al ajo especial', 'adicionales', 13, '10 unidades con mozzarella, jamón inglés, aceitunas y hot dog.', 'ajo', 4);
agregar('PAN-CACHITOS', 'Cachitos', 'panes', 1, 'Paquete de 3 unidades.', 'pan', 4);
for (const [peso, unidad, docena] of [[50, 3.5, 35], [100, 4.5, 45]]) {
  agregar(`PAN-MOZ-${peso}`, `Pan relleno de mozzarella y aceituna ${peso} g`, 'panes', unidad,
    'Relleno de mozzarella y aceituna.', 'pan', 4, { variantes: [
      { nombre: `Unidad de ${peso} g`, precio: dinero(unidad) },
      { nombre: `Docena de ${peso} g`, precio: dinero(docena) }
    ] });
}
for (const sabor of ['Manjar blanco', 'Chocolate']) agregar(`PAN-${sabor === 'Chocolate' ? 'CHOCOLATE' : 'MANJAR'}`,
  `Pan relleno de ${sabor.toLowerCase()}`, 'panes', 1.5, '100 g por unidad. Realizar pedido con anticipación.', 'pan', 4,
  { variantes: [{ nombre: 'Unidad de 100 g', precio: '1.50' }, { nombre: 'Docena', precio: '15.00' }] });

// Página 5: elecciones de proteína y queso sin recargo, según la carta.
for (const [clave, nombre, precio, descripcion] of [
  ['CLASICA', 'Hamburguesa clásica', 12, 'Hamburguesa casera de 100 g, tomate, queso, lechuga y papas al hilo.'],
  ['ROYALE', 'Hamburguesa royale', 14, 'Hamburguesa casera de 100 g, huevo, tomate, queso, lechuga y papas al hilo.'],
  ['SUPER-CLASICA', 'Hamburguesa súper clásica', 15, 'Hamburguesa casera de 100 g, huevo, tomate, queso, lechuga y papas fritas nativas.'],
  ['LOMO-FINO', 'Hamburguesa súper especial de lomo fino', 15, 'Lomo fino de 100 g, huevo, champiñones, tomate, queso, lechuga y papas fritas nativas.']
]) agregar(`HAM-${clave}`, nombre, 'hamburguesas', precio, `${descripcion} Incluye sus respectivas salsas.`, 'hamburguesa', 5,
  { grupos: clave === 'LOMO-FINO' ? ['queso'] : ['proteina', 'queso'] });

for (const [clave, nombre, descripcion, imagen] of [
  ['GALLINA', 'Caldo de gallina especial', 'Caldo de gallina, huevo duro, presa, papa amarilla, fideos, cebollita china y canchita.', 'caldo'],
  ['MINUTA', 'Sopa a la minuta', 'Carne, huevos reventados, papa amarilla, fideos, leche y pan al horno.', 'minuta'],
  ['POLLO', 'Sustancia de pollo', 'Caldo de pollo, huevo reventado, filete de pollo en trozos, papa amarilla, fideos, cebollita china y pan al horno.', 'caldo']
]) agregar(`SOP-${clave}`, nombre, 'sopas', 14, descripcion, imagen, 6,
  { grupos: clave === 'GALLINA' ? ['presa-gallina'] : [] });

for (const [clave, nombre, precio, descripcion, imagen] of [
  ['SALCHIPAPA', 'Salchipapa', 15, 'Papas fritas, chorizo, huevo y ensalada.', 'salchipapa'],
  ['CHULETA', 'Chuleta de lechón', 40, 'Chuleta de lechón, ensalada y papas nativas.', 'chuleta'],
  ['POLLO-PLANCHA', 'Pollo a la plancha', 23, 'Pollo, papas fritas amarillas, arroz y ensalada.', 'pollo'],
  ['BISTEC', 'Bistec de lomo fino', 30, 'Lomo fino, arroz, ensalada, papas fritas amarillas, plátano frito y huevo.', 'bistec'],
  ['TALLARIN-RES', 'Tallarín saltado de res', 25, '', 'tallarin'],
  ['TALLARIN-POLLO', 'Tallarín saltado de pollo', 20, '', 'tallarin'],
  ['CHAUFA-CECINA', 'Arroz chaufa de cecina selvática', 25, '', 'chaufa'],
  ['CHAUFA-RES', 'Arroz chaufa de res', 25, '', 'chaufa'],
  ['CHAUFA-POLLO', 'Arroz chaufa de pollo', 20, '', 'chaufa'],
  ['CHAUFA-CERDO', 'Arroz chaufa de cerdo', 25, '', 'chaufa'],
  ['LOMO-POLLO', 'Lomo saltado de pollo', 20, '', 'lomo'],
  ['LOMO-RES', 'Lomo saltado de res', 30, '', 'lomo'],
  ['BROASTER', 'Broaster', 23, 'Pechuga o pierna de pollo, ensalada, papas fritas y arroz opcional.', 'broaster'],
  ['LOMO-POBRE', 'Lomo saltado a lo pobre', 34, 'Preparado con lomo fino.', 'lomo'],
  ['POLLO-POBRE', 'Lomo saltado de pollo a lo pobre', 24, '', 'lomo'],
  ['MOSTRITO', 'Mostrito a la Veneziana', 25, 'Papas fritas, pollo broaster, ensalada, arroz chaufa y cremas.', 'broaster']
]) agregar(`CRI-${clave}`, nombre, 'criollos', precio, descripcion, imagen,
  ['BROASTER', 'LOMO-POBRE', 'POLLO-POBRE', 'MOSTRITO'].includes(clave) ? 8 : 7,
  { grupos: clave === 'BROASTER' ? ['presa', 'arroz'] : [] });

for (const [clave, nombre, precio, imagen] of [
  ['PAPAS', 'Porción de papas fritas', 8, 'papas'], ['ENSALADA', 'Ensalada de casa', 6, 'ensalada'],
  ['HUEVO', 'Huevo sancochado adicional', 2, 'huevo']
]) agregar(`ADI-${clave}`, nombre, 'adicionales', precio, '', imagen, 9);

agregar('PAS-LASANA', 'Lasaña', 'pastas', 25, 'Por porción. Pasta fresca de espinaca, ragú, bechamel y parmesano. Incluye pan al ajo.', 'lasana', 10);
agregar('PAS-ALFREDO', 'Fideos al Alfredo', 'pastas', 28, 'Pasta fresca, salsa blanca, fideo grueso, jamón y pollo o lomo. Incluye pan al ajo.', 'alfredo', 10,
  { variantes: [{ nombre: 'De pollo', precio: '28.00' }, { nombre: 'De lomo', precio: '30.00' }] });
agregar('PAS-PESTO', 'Espaguetis al pesto', 'pastas', 30, 'Bistec, salsa al pesto y queso parmesano. Incluye pan al ajo.', 'pesto', 10);
agregar('PAS-TORTELLINI', 'Tortellini o cappelletti', 'pastas', 30, 'Pasta fresca rellena de carne y ricotta, salsa ragú y salsa blanca. Incluye pan al ajo.', 'tortellini', 10,
  { variantes: [{ nombre: 'Tortellini', precio: '30.00' }, { nombre: 'Cappelletti', precio: '30.00' }] });
agregar('PAS-RAVIOLES', 'Ravioles', 'pastas', 30, 'Pasta fresca rellena de ricotta y espinaca, con salsa ragú. Incluye pan al ajo.', 'ravioles', 10);

for (const [clave, nombre, imagen] of [
  ['LIMONADA', 'Limonada', 'limonada'], ['MARACUYA', 'Maracuyá', 'fro-maracuya'], ['CHICHA', 'Chicha', 'chicha'],
  ['PINA', 'Piña', 'fro-pina'], ['FRESA', 'Fresa', 'fro-fresa'], ['MARACUMANGO', 'Maracumango', 'fro-maracumango'],
  ['LUCUMA', 'Lúcuma', 'fro-lucuma'], ['ARANDANOS', 'Arándanos', 'fro-arandanos'], ['DURAZNO', 'Durazno', 'fro-durazno']
]) agregar(`FRO-${clave}`, `${nombre} frozen`, 'frozen', 9, 'Bebida frozen.', imagen, 11,
  { variantes: [{ nombre: '1/2 litro', precio: '9.00' }, { nombre: '1 litro', precio: '17.00' }] });

for (const [clave, nombre, soloMedio] of [
  ['MARACUYA-SOUR', 'Maracuyá sour', false], ['PISCO-SOUR', 'Pisco sour', false],
  ['ALGARROBINA', 'Cóctel de algarrobina', false], ['DURAZNO', 'Cóctel de durazno', true],
  ['CHILCANO', 'Chilcano', true], ['CHILCANO-MARACUYA', 'Chilcano de maracuyá', true],
  ['SANGRIA', 'Sangría', false], ['PINA-COLADA', 'Piña colada', false],
  ['PITUFO', 'Espuma de pitufo', true], ['LAGUNA-AZUL', 'Laguna azul', true], ['PANTERA', 'Pantera rosa', false]
]) agregar(`TRA-${clave}`, nombre, 'tragos', 15, 'Bebida alcohólica.', clave === 'PISCO-SOUR' ? 'pisco' : `tra-${clave.toLowerCase()}`, 12,
  { variantes: [{ nombre: 'Copa', precio: '15.00' }, { nombre: '1/2 litro', precio: '23.00' },
    ...(!soloMedio ? [{ nombre: '1 litro', precio: '42.00' }] : [])] });
agregar('TRA-CALIENTITO', 'Calientito', 'tragos', 15, 'Taza. Bebida alcohólica.', 'infusion', 12);
agregar('TRA-CERVEZA', 'Cerveza', 'tragos', 9, 'La carta no especifica marca ni volumen.', 'cerveza', 12, { directo: true });
agregar('TRA-CORONA', 'Corona margarita', 'tragos', 28, 'Bebida alcohólica.', 'tra-corona', 12);

// Marcas y volumen confirmados por el propietario. Conservar los SKU antiguos
// de agua e Inca Kola mantiene sus IDs, vínculos de inventario e historial.
agregar('FRI-AGUA', 'Agua San Luis 625 ml', 'frias', 3, 'Botella San Luis de 625 ml.', 'agua-san-luis', 13, { directo: true });
agregar('FRI-AGUA-1L', 'Agua San Luis 1 litro', 'frias', 5, 'Botella San Luis de 1 litro.', 'agua-san-luis', 13, { directo: true });
for (const [clave, nombre, precio] of [
  ['PERSONAL', 'personal', 3], ['GORDITA', 'gordita', 6], ['MEDIO', '500 ml', 4.5],
  ['1L', '1 litro', 8], ['15L', '1.5 litros', 10], ['3L', '3 litros', 15]
]) {
  agregar(`FRI-GAS-${clave}`, `Inca Kola ${nombre}`, 'frias', precio,
    `Gaseosa Inca Kola, presentación ${nombre}.`, 'inca-kola', 13, { directo: true });
  // Gordita es exclusiva de Inca Kola. Cada envase se controla por separado.
  if (clave !== 'GORDITA') agregar(`FRI-COCA-${clave}`, `Coca-Cola ${nombre}`, 'frias', precio,
    `Gaseosa Coca-Cola, presentación ${nombre}.`, 'coca-cola', 13, { directo: true });
}
for (const [clave, nombre, precio, imagen] of [
  ['CAFE', 'Café', 6, 'cafe'], ['CAPUCHINO', 'Capuchino', 10, 'capuchino'],
  ['INFUSION', 'Infusión', 4, 'infusion'], ['JARRA', 'Jarra de infusión 1 litro', 10, 'infusion']
]) agregar(`CAL-${clave}`, nombre, 'calientes', precio, '', imagen, 13);

// Los adicionales de la página 9 también se pueden elegir dentro del plato.
for (const producto of productos) {
  if (['criollos', 'hamburguesas', 'sopas', 'pastas'].includes(producto.categoria)) {
    producto.grupos = [...(producto.grupos ?? []), 'adicionales'];
  }
}
export const productosCarta = productos;
export const gruposCarta = {
  proteina: { nombre: 'Proteína de hamburguesa', obligatorio: true, opciones: ['Carne', 'Pollo'] },
  queso: { nombre: 'Queso de hamburguesa', obligatorio: true, opciones: ['Cheddar', 'Edam'] },
  presa: { nombre: 'Presa de broaster', obligatorio: true, opciones: ['Pechuga', 'Pierna'] },
  'presa-gallina': { nombre: 'Presa del caldo de gallina', obligatorio: true, opciones: ['Pecho (pechuga)', 'Pierna'] },
  arroz: { nombre: 'Arroz del broaster', obligatorio: true, opciones: ['Con arroz', 'Sin arroz'] },
  adicionales: { nombre: 'Adicionales de platos a la carta', obligatorio: false, multiple: true,
    opciones: [{ nombre: 'Porción de papas fritas', precio: '8.00' },
      { nombre: 'Ensalada de casa', precio: '6.00' }, { nombre: 'Huevo sancochado', precio: '2.00' }] }
};

// Página 14: referencia de tarifas, no productos de comida ni cobros automáticos.
export const tarifasDelivery = [
  ['Nuevo Imperial', 3], ['Santa Adela', 2], ['Santa María', 6], ['Cerro Alegre', 7],
  ['7 de Agosto (Prof. Valeriano)', 3], ['Florida', 6], ['Desierto', 6], ['Cementerio N.I.', 4],
  ['San Vicente', 8], ['Imperial', 5], ['Malvinas', 5], ['Asunción 8', 5],
  ['Cerro Libre', 5], ['Almenares', 5], ['Hualcará', 6]
].map(([zona, importe]) => ({ zona, importe: dinero(importe) }));
