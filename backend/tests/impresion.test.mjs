import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ejecutarAgente } from '../scripts/agente-impresion.mjs';
import { formatearTicket, formatearCierre } from '../src/services/ticket-formato.js';
const contenido = { documento: 'ticket_interno', titulo: 'LA VENEZIANA', codigo: 'T-PRUEBA', pedido: 'P-TEST', atencion: 'llevar', fecha: '2026-10-23',
  lineas: [{ nombre: 'Caldo de gallina con indicaciones de preparación', cantidad: 1, total: '10.00', variante: 'Personal', modificadores: ['Pecho'], indicaciones: 'Sin sal\x1b@' }],
  subtotal: '8.47', impuesto: '1.53', total: '10.00', pagos: [{ metodo: 'efectivo', importe: '10.00', recibido: '20.00', vuelto: '10.00' }] };
test('cierre y copia de 58/80 mm conservan el snapshot, descuadre y solicitante', () => {
  const c = { documento: 'cierre_caja', titulo: 'LA VENEZIANA', usuario_id: 7, numero_copia: 2,
    snapshot: { sesion: { id: 8 }, corte_utc: '2026-10-23T18:00:00Z', cierre: { contado: '158.00', descuadre: '-1.00', observaciones: 'Conteo revisado' },
      totales: { apertura: '100.00', cobrado_por_metodo: { efectivo: '60.00' }, devuelto_por_metodo: { efectivo: '6.00' }, ingresos: '20.00', egresos: '15.00', teorico_efectivo: '159.00', neto_por_metodo: { efectivo: '54.00', yape: '36.00' } } } }
  for (const ancho of [58, 80]) {
    const texto = formatearCierre(c, ancho)
    assert.ok(texto.includes('COPIA 2') && texto.includes('DESCUADRE: S/ -1.00') && texto.includes('Usuario solicitante: 7'))
    assert.ok(texto.split('\n').every(l => [...l].length <= (ancho === 58 ? 32 : 48)))
    assert.ok(texto.includes('SIN APERTURA DE CAJON'))
  }
})
test('agente canal caja entrega el cierre y reconoce su identidad sin repetir el archivo', async () => {
  const carpeta = await mkdtemp(join(tmpdir(), 'veneziana-cierre-'));
  const uid = 'cierre_prueba_123';
  const c = { documento: 'cierre_caja', titulo: 'LA VENEZIANA', usuario_id: 7, numero_copia: 0,
    snapshot: { sesion: { id: 8 }, corte_utc: '2026-10-23T18:00:00Z', cierre: { contado: '0.00', descuadre: '0.00' },
      totales: { apertura: '0.00', cobrado_por_metodo: { efectivo: '0.00' }, devuelto_por_metodo: { efectivo: '0.00' }, ingresos: '0.00', egresos: '0.00', teorico_efectivo: '0.00', neto_por_metodo: { efectivo: '0.00' } } } };
  const servidor = createServer((req, res) => {
    assert.equal(req.headers.cookie, 'sesion=prueba');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') {
      assert.equal(req.url, '/api/caja/impresion/pendientes');
      return res.end(JSON.stringify({ trabajos: [{ job_uid: uid, destino: 'caja', contenido: c }] }));
    }
    assert.equal(req.url, `/api/caja/impresion/${uid}/simulacion`);
    res.end(JSON.stringify({ job_uid: uid, modo: 'simulacion' }));
  });
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  try {
    const opciones = { api: `http://127.0.0.1:${servidor.address().port}/api`, origen: 'http://localhost:5173', cookie: 'sesion=prueba', carpeta, canal: 'caja', ancho: 58 };
    await ejecutarAgente(opciones); await ejecutarAgente(opciones);
    assert.deepEqual(await readdir(carpeta), [`${uid}.txt`]);
    assert.equal(await readFile(join(carpeta, `${uid}.txt`), 'utf8'), formatearCierre(c, 58));
  } finally { await new Promise(r => servidor.close(r)); await rm(carpeta, { recursive: true, force: true }); }
});
test('formato 58/80 mm, texto largo y sin comandos de control', () => {
  for (const ancho of [58, 80]) {
    const texto = formatearTicket(contenido, ancho);
    assert.ok(texto.split('\n').every(l => [...l].length <= (ancho === 58 ? 32 : 48)));
    assert.ok(texto.includes('Pecho') && texto.includes('Vuelto: S/ 10.00'));
    assert.ok(!texto.includes('\x1b'));
    assert.ok(texto.includes('NO FISCAL'));
  }
  assert.throws(() => formatearTicket(contenido, 60));
});
test('agente autenticado: ACK perdido, reinicio, archivo único y resultado por job_uid', async () => {
  const carpeta = await mkdtemp(join(tmpdir(), 'veneziana-agente-'));
  const uid = 'trabajo_prueba_123';
  let fallo = true, ack = 0;
  const servidor = createServer(async (req, res) => {
    assert.equal(req.headers.cookie, 'sesion=prueba');
    if (req.method === 'GET') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ trabajos: [{ job_uid: uid, destino: 'caja', contenido }] })); }
    assert.equal(req.headers['x-csrf-protection'], '1');
    assert.equal(req.headers['idempotency-key'], `sim-${uid}`);
    assert.equal(req.url, `/api/pedidos/impresion/${uid}/simulacion`);
    let raw = ''; for await (const c of req) raw += c;
    assert.match(JSON.parse(raw).sha256, /^[a-f0-9]{64}$/);
    ack++;
    if (fallo) { res.writeHead(503); return res.end(); }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ job_uid: uid, modo: 'simulacion' }));
  });
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const opciones = { api: `http://127.0.0.1:${servidor.address().port}/api`, origen: 'http://localhost:5173', cookie: 'sesion=prueba', carpeta };
  try {
    await assert.rejects(() => ejecutarAgente(opciones), /503/);
    fallo = false;
    const r = await ejecutarAgente(opciones);
    assert.equal(r[0].job_uid, uid); assert.equal(r[0].impresion_fisica, false); assert.equal(ack, 2);
    assert.deepEqual(await readdir(carpeta), [`${uid}.txt`]);
    assert.equal(await readFile(join(carpeta, `${uid}.txt`), 'utf8'), formatearTicket(contenido));
    await assert.rejects(() => ejecutarAgente({ ...opciones, cookie: '' }));
    await assert.rejects(() => ejecutarAgente({ ...opciones, api: 'http://example.com/api' }));
  } finally { await new Promise(r => servidor.close(r)); await rm(carpeta, { recursive: true, force: true }); }
});
