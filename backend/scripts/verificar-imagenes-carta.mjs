// Comprobar que cada URL devuelve una imagen real antes de usarla en el catálogo.
// Las copias son solo evidencia local; el producto conserva la URL externa.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as esperar } from 'node:timers/promises';
import { resolve } from 'node:path';
const imagenes = JSON.parse(await readFile(new URL('../data/carta-imagenes.json', import.meta.url), 'utf8'));
const carpeta = process.argv[2] ? resolve(process.argv[2]) : null;
if (carpeta) await mkdir(carpeta, { recursive: true });
let fallos = 0;
for (const [clave, imagen] of Object.entries(imagenes)) {
  let respuesta;
  for (let intento = 0; intento < 3; intento++) {
    respuesta = await fetch(imagen.url, { signal: AbortSignal.timeout(20000) });
    if (respuesta.status !== 429) break;
    await respuesta.arrayBuffer();
    await esperar(2000 * (intento + 1));
  }
  if (!respuesta.ok || !respuesta.headers.get('content-type')?.startsWith('image/')) {
    console.log(`FALLO ${clave}: HTTP ${respuesta.status}`); fallos++; continue;
  }
  const datos = new Uint8Array(await respuesta.arrayBuffer());
  if (carpeta) await writeFile(resolve(carpeta, `${clave}.jpg`), datos);
  console.log(`OK ${clave}: ${datos.length} bytes`);
}
if (fallos) process.exitCode = 1;
console.log(`Resultado: ${Object.keys(imagenes).length - fallos} imágenes válidas, ${fallos} fallos.`);
