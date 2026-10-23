// Catálogo de fotos encontradas en Wikimedia Commons. Guarda URL, autor y licencia.
// Solo realiza consultas de metadatos; las fotos son referenciales, no del local.
import { writeFile, mkdir } from 'node:fs/promises';
const archivos = {
  'tra-maracuya-sour': 'Maracuya sour- Restaurant galliano.jpg',
  'tra-algarrobina': 'Coctelalgarro.jpg',
  'tra-durazno': 'VTR - Peach Shrub (9633450916).jpg',
  'tra-chilcano': 'Chilcano de Pisco Superba 09012010.JPG',
  'tra-sangria': 'Sangría, Mazatlán, 30 de noviembre de 2022.jpg',
  'tra-pina-colada': 'Piña Colada.jpg',
  'tra-pitufo': 'Bluehawaiian.jpg',
  'tra-laguna-azul': 'Cocktail Blue Lagoon at the pitch bar.jpg',
  'tra-pantera': 'Pantera rosa, Mazatlán, 30 de noviembre de 2022.jpg',
  'inca-kola': 'Bottle of Inca Kola.jpg',
  'fro-fresa': 'Glass of strawberry smoothie (6828826294).jpg',
  'fro-lucuma': 'Batido lúcuma.jpg', 'fro-maracuya': 'Passion Fruit juice.jpg',
  'fro-pina': 'Batido de piña.jpg', 'fro-maracumango': 'Fresh-mango-smoothie 01.jpg',
  'fro-arandanos': 'Blueberry smoothie.jpg', 'fro-durazno': 'Summer peach Cobbler Smoothie05.jpg',
  pizza: 'Pepperoni pizza.jpg', margarita: 'Margherita Originale.JPG', hawaiana: 'Hawaiian pizza 1.jpg',
  ajo: 'Garlic bread baguettes 2.jpg', pan: 'Home made sour dough bread.jpg', hamburguesa: 'RedDot Burger.jpg',
  caldo: 'Chicken Noodle Soup US.jpg', minuta: 'Nabari Gyujiru, Beef Soup of Nabari.jpg', salchipapa: 'Salchipapas Plaza de Armas.jpg',
  chuleta: 'Pork chops 167541218.jpg', pollo: 'Grilled chicken breast, Santo Domingo, La Palma.jpg',
  bistec: 'Beef steak (11888070325).jpg', chaufa: 'Arroz chaufa simple.JPG', tallarin: 'Mie Goreng Natra Bintan.jpg',
  lomo: 'Lomo-saltado-perudelights.jpg', broaster: 'Fried-Chicken-Set.jpg', lasana: 'Meaty Lasagna 8of8 (8736299782).jpg',
  alfredo: 'Chicken fettuccine alfredo.JPG', pesto: 'Pasta al pesto fatto in casa.jpg', tortellini: 'Tortellini Bolognesi.jpg',
  ravioles: 'Ravioli di Faraona.JPG', frozen: 'Praha Bistro Zámecké schody Smoothies.jpg', limonada: 'Lemonade - 27682817724.jpg',
  chicha: 'Chicha Morada 2017.jpg', pisco: 'Pisco sour 20100613b.JPG', coctel: 'PiscoSour.JPG', cerveza: 'Jeju beer 09 (cropped).jpg',
  agua: 'Water Bottle (51308317077).jpg', gaseosa: 'Cola.jpg', cafe: 'Espresso shot in a cappuccino cup.jpg', capuchino: 'Cappuccino.jpg',
  infusion: 'Cup of tea.jpg', papas: 'French fries.jpg', ensalada: 'Salad platter.jpg', huevo: 'Soft-boiled-egg.jpg'
};
// La API admite hasta 50 títulos por petición. Fragmentar permite ampliar el
// catálogo sin perder silenciosamente los últimos archivos de la lista.
const paginas = [];
const titulos = Object.values(archivos);
for (let inicio = 0; inicio < titulos.length; inicio += 40) {
  const parametros = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo',
    titles: titulos.slice(inicio, inicio + 40).map(n => `File:${n}`).join('|'), iiprop: 'url|extmetadata', iiurlwidth: '640' });
  const respuesta = await fetch(`https://commons.wikimedia.org/w/api.php?${parametros}`);
  if (!respuesta.ok) throw new Error(`Wikimedia: HTTP ${respuesta.status}`);
  const datos = await respuesta.json();
  if (!datos.query?.pages) throw new Error('Wikimedia no devolvió los metadatos solicitados.');
  paginas.push(...Object.values(datos.query.pages));
}
const limpiar = texto => (texto ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
// Estos dos archivos antiguos no tienen el autor en metadatos automáticos.
// La autoría está publicada en la página de descripción del archivo.
const autoresManuales = { pizza: 'Jon Sullivan (PD Photo.org)', gaseosa: 'MASA' };
const imagenes = {};
for (const [clave, nombre] of Object.entries(archivos)) {
  const pagina = paginas.find(p => p.title === `File:${nombre}`);
  const info = pagina?.imageinfo?.[0];
  if (!info) throw new Error(`Falta imagen ${clave}: ${nombre}`);
  const url = new URL(info.thumburl ?? info.url);
  for (const n of [...url.searchParams.keys()]) if (n.startsWith('utm_')) url.searchParams.delete(n);
  if (url.href.length > 255) throw new Error(`URL demasiado larga: ${clave}`);
  imagenes[clave] = { url: url.href, archivo: pagina.title, fuente: info.descriptionurl,
    autor: limpiar(info.extmetadata.Artist?.value) || autoresManuales[clave] || 'Consultar autor en la fuente',
    licencia: limpiar(info.extmetadata.LicenseShortName?.value), licenciaUrl: info.extmetadata.LicenseUrl?.value ?? info.descriptionurl };
  console.log(`${clave}: ${pagina.title}`);
}
// Fotografías de marca y distribuidor: mantener su procedencia explícita,
// sin atribuirles una licencia Creative Commons que no tienen.
Object.assign(imagenes, {
  'tra-corona': {"url": "https://www.coronausa.com/cdn/shop/articles/coronanita-card_f5a33966-2396-4815-829e-1b5f1d912440_1200x1200.jpg?v=1747681254", "fuente": "https://www.coronausa.com/blogs/recipes/coronarita", "autor": "Corona USA / Constellation Brands", "licencia": "Imagen oficial de receta; derechos reservados", "licenciaUrl": "https://www.coronausa.com/blogs/recipes/coronarita"},
  'tra-chilcano-maracuya': {"url": "https://jameaperu.com/assets/images/2020/08/chilcano-de-maracuya_1500x1000.webp", "fuente": "https://jameaperu.com/recetas/bebidas/chilcano-de-maracuya/", "autor": "Jamea Perú", "licencia": "Fotografía de receta; derechos reservados", "licenciaUrl": "https://jameaperu.com/recetas/bebidas/chilcano-de-maracuya/"},
  'coca-cola': {
    url: 'https://www.coca-cola.com/content/dam/onexp/pe/es/brands/coca-cola/coca-cola/CC-300ml.jpg',
    fuente: 'https://www.coca-cola.com/pe/es/brands/coca-cola', autor: 'The Coca-Cola Company',
    licencia: 'Imagen oficial de producto; derechos reservados', licenciaUrl: 'https://www.coca-cola.com/pe/es/legal/terms-of-use'
  },
  'agua-san-luis': {
    url: 'https://cdn.shopify.com/s/files/1/0273/3172/3358/products/agua-sin-gas-besofrances.jpg?v=1628185867',
    fuente: 'https://besofrances.com/products/agua-sin-gas-san-luis', autor: 'Beso Francés / San Luis',
    licencia: 'Fotografía comercial de producto; derechos reservados', licenciaUrl: 'https://besofrances.com/products/agua-sin-gas-san-luis'
  }
});
const destino = new URL('../data/', import.meta.url);
await mkdir(destino, { recursive: true });
await writeFile(new URL('carta-imagenes.json', destino), JSON.stringify(imagenes, null, 2) + '\n');
console.log(`Guardadas ${Object.keys(imagenes).length} imágenes con créditos.`);
