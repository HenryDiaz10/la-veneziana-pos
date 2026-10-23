import cookieParser from 'cookie-parser';
import { WebSocketServer, WebSocket } from 'ws';
import { env } from '../config/env.js';
import { autenticarTokenSesion } from '../middlewares/autenticar.js';
import { NOMBRE_COOKIE_SESION } from '../security/cookies.js';

const permiteKds = auth => auth?.usuario.permisos.some(p => p.modulo === 'kds' && p.accion === 'operar');
// Mismo servidor HTTP, sin puerto adicional ni tokens en URL/localStorage.
export function crearCanalKds(server, { intervaloMs = 15000 } = {}) {
  const wss = new WebSocketServer({ noServer: true, clientTracking: false, maxPayload: 1024, perMessageDeflate: false });
  const clientes = new Set(), pendientes = new Set(), autenticaciones = new Set();
  let cerrando = false, revisando = false;
  const identificar = token => {
    const consulta = autenticarTokenSesion(token); autenticaciones.add(consulta);
    void consulta.finally(() => autenticaciones.delete(consulta)).catch(() => {});
    return consulta;
  };
  const rechazar = (socket, codigo) => {
    if (socket.destroyed) return;
    socket.end(`HTTP/1.1 ${codigo}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    const fin = setTimeout(() => socket.destroy(), 1000); fin.unref(); socket.once('close', () => clearTimeout(fin));
  };
  const cerrarCliente = (c, codigo = 1008) => {
    c.ws.close(codigo, 'Reconecta con una sesión KDS vigente');
    const fin = setTimeout(() => c.ws.terminate(), 1000); fin.unref(); c.ws.once('close', () => clearTimeout(fin));
  };
  async function enviar(c, datos) {
    if (c.ws.readyState !== WebSocket.OPEN) return false;
    // Cortar clientes lentos; recuperarán el estado por HTTP al reconectar.
    if (c.ws.bufferedAmount > 65536) { cerrarCliente(c, 1013); c.ws.terminate(); return false; }
    return new Promise(resolve => c.ws.send(datos, error => { if (error) { clientes.delete(c); c.ws.terminate(); } resolve(!error); }));
  }
  async function upgrade(req, socket, head) {
    socket.on('error', () => socket.destroy());
    if (req.url !== '/api/kds/ws') return rechazar(socket, '404 Not Found');
    if (req.headers.origin !== env.origenFrontend) return rechazar(socket, '403 Forbidden');
    if (cerrando || pendientes.size >= 30 || clientes.size >= 200) return rechazar(socket, '503 Service Unavailable');
    pendientes.add(socket);
    const limite = setTimeout(() => socket.destroy(), 5000); limite.unref();
    try {
      cookieParser()(req, {}, () => {});
      const token = req.cookies?.[NOMBRE_COOKIE_SESION], auth = await identificar(token);
      if (!auth) return rechazar(socket, '401 Unauthorized');
      if (!permiteKds(auth)) return rechazar(socket, '403 Forbidden');
      if (cerrando || socket.destroyed) return socket.destroy();
      if (clientes.size >= 200 || [...clientes].filter(c => c.uid === auth.usuario.id).length >= 10) return rechazar(socket, '429 Too Many Requests');
      wss.handleUpgrade(req, socket, head, ws => {
        const c = { ws, token, uid: auth.usuario.id, vivo: true };
        clientes.add(c);
        ws.on('error', () => { clientes.delete(c); ws.terminate(); });
        ws.on('close', () => clientes.delete(c));
        ws.on('pong', () => { c.vivo = true; });
        // Las transiciones usarán REST con CSRF/versión; este canal solo avisa.
        ws.on('message', () => cerrarCliente(c));
        void enviar(c, JSON.stringify({ protocolo: 1, tipo: 'kds.conectado', requiere_snapshot: true, servidor_en: new Date().toISOString() }));
      });
    } catch { rechazar(socket, '503 Service Unavailable'); }
    finally { clearTimeout(limite); pendientes.delete(socket); }
  }
  server.on('upgrade', upgrade);
  async function verificarConexiones() {
    if (revisando || cerrando) return;
    revisando = true;
    const sesiones = new Map();
    try {
      await Promise.all([...clientes].map(async c => {
        if (!c.vivo) { clientes.delete(c); c.ws.terminate(); return; }
        c.vivo = false;
        try {
          if (!sesiones.has(c.token)) sesiones.set(c.token, identificar(c.token));
          if (!permiteKds(await sesiones.get(c.token))) return cerrarCliente(c);
          if (c.ws.readyState === WebSocket.OPEN) c.ws.ping();
        } catch { cerrarCliente(c, 1011); }
      }));
    } finally { revisando = false; }
  }
  const reloj = setInterval(() => { void verificarConexiones(); }, intervaloMs); reloj.unref();
  return {
    // Revalidar antes de cada aviso; no enviar datos a una sesión ya revocada.
    async publicar(evento) {
      if (cerrando) throw new Error('CANAL_KDS_CERRADO');
      const datos = JSON.stringify(evento), sesiones = new Map();
      const resultados = await Promise.all([...clientes].map(async c => {
        if (!sesiones.has(c.token)) sesiones.set(c.token, identificar(c.token));
        const auth = await sesiones.get(c.token);
        if (!permiteKds(auth)) { cerrarCliente(c); return false; }
        return enviar(c, datos);
      }));
      return { enviados: resultados.filter(Boolean).length };
    },
    verificarConexiones,
    async cerrar() {
      if (cerrando) return;
      cerrando = true; clearInterval(reloj); server.removeListener('upgrade', upgrade);
      for (const socket of pendientes) socket.destroy();
      for (const c of clientes) c.ws.terminate(); clientes.clear();
      await new Promise(resolve => wss.close(resolve));
      await Promise.allSettled([...autenticaciones]);
    }
  };
}
