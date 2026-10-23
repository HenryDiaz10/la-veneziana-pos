import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { formatearTicket } from '../src/services/ticket-formato.js';

// Agente autenticado de una pasada. No abre puertos ni escucha conexiones.
// Solo simulación: NO envía ESC/POS, no corta papel ni abre el cajón.
export async function ejecutarAgente({ api, origen, cookie, carpeta, ancho = 80 }) {
  const url = new URL(api), origin = new URL(origen);
  if (url.username || url.password || url.search || url.hash || origin.origin !== origen ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new Error('Usa HTTPS o localhost sin credenciales en la URL.');
  if (typeof cookie !== 'string' || !cookie || /[\r\n]/.test(cookie) || !carpeta || ![58, 80].includes(ancho)) throw new Error('Configura sesión, carpeta de salida y ancho 58/80.');
  const raiz = resolve(carpeta);
  await mkdir(raiz, { recursive: true });
  const pedir = async (ruta, body, key) => {
    const r = await fetch(`${api.replace(/\/$/, '')}${ruta}`, { method: body ? 'POST' : 'GET', redirect: 'error',
      signal: AbortSignal.timeout(15000), headers: { Cookie: cookie, Origin: origen, Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1', 'Idempotency-Key': key } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error(`Agente rechazado por el servidor (${r.status}).`);
    return r.json();
  };
  const { trabajos } = await pedir('/pedidos/impresion/pendientes');
  const resultados = [];
  for (const job of trabajos) {
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(job.job_uid) || job.destino !== 'caja') throw new Error('Trabajo no válido.');
    const texto = formatearTicket(job.contenido, ancho);
    const sha256 = createHash('sha256').update(texto).digest('hex');
    const archivo = join(raiz, `${job.job_uid}.txt`);
    // Creación exclusiva: un reinicio o dos agentes no producen otra copia.
    // Si cae antes del ACK, se verifica el mismo archivo y se repite el ACK.
    try { await writeFile(archivo, texto, { flag: 'wx' }); }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (await readFile(archivo, 'utf8') !== texto) throw new Error('El archivo previo no coincide. Revisa el trabajo antes de continuar.');
    }
    const r = await pedir(`/pedidos/impresion/${job.job_uid}/simulacion`, { sha256 }, `sim-${job.job_uid}`);
    resultados.push({ job_uid: r.job_uid, modo: r.modo, impresion_fisica: false });
  }
  return resultados;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const resultados = await ejecutarAgente({ api: process.env.IMPRESION_API_URL ?? 'http://localhost:3000/api',
      origen: process.env.IMPRESION_ORIGEN ?? 'http://localhost:5173', cookie: process.env.IMPRESION_COOKIE,
      carpeta: process.env.IMPRESION_CARPETA, ancho: Number(process.env.IMPRESION_ANCHO ?? '80') });
    console.log(JSON.stringify({ modo: 'simulacion', resultados }));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
