// Importar la configuración validada antes de iniciar el servidor.
import { env } from './config/env.js';

// Importamos la aplicación Express configurada en app.js.
import app from './app.js';

// Importamos el logger compartido para registrar
// los mensajes del servidor mediante Pino.
import logger from './logger.js';

// Utilizar el puerto que config/env.js ya convirtió y validó.
const PORT = env.puerto;

// Utilizar la dirección de escucha validada.
const HOST = env.host;

// Comprobamos que el puerto sea un número entero válido.
// Los puertos que utilizaremos deben estar entre 1 y 65535.
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  // Detenemos el arranque si la configuración es incorrecta.
  throw new Error('PORT debe ser un número entero entre 1 y 65535.');
}

// Iniciamos el servidor y conservamos el objeto para gestionar sus eventos.
// Express 5 pasa un error a esta función si el arranque falla.
const server = app.listen(PORT, HOST, (err) => {
  // Si hubo un error, evitamos anunciar un arranque exitoso.
  // El bloque server.on('error', ...) que ya tenemos lo registrará.
  if (err) {
    return;
  }

  // Este mensaje se registra únicamente cuando el servidor inició.
  logger.info(
    { host: HOST, port: PORT },
    `Servidor disponible en http://${HOST}:${PORT}`
  );
});

// Escuchamos los errores del servidor, como un puerto ocupado.
// "error" es el evento; err contiene información del fallo.
server.on('error', (err) => {
  // EADDRINUSE significa que la dirección y el puerto ya están en uso.
  if (err.code === 'EADDRINUSE') {
    logger.error(
      { host: HOST, port: PORT, code: err.code },
      'No se pudo iniciar: el puerto está ocupado.'
    );
  } else {
    // Registramos el código de cualquier otro error del servidor.
    logger.error(
      { code: err.code },
      'Ocurrió un error en el servidor.'
    );
  }

  // Indicamos que el proceso debe terminar con un código de fallo.
  // Permite que Node finalice cuando no queden tareas pendientes.
  process.exitCode = 1;
});

// Guardamos las conexiones que todavía no enviaron una solicitud.
// Algunos navegadores abren conexiones anticipadamente.
const conexionesSinSolicitud = new Set();

// "connection" se ejecuta cuando se abre una conexión TCP.
server.on('connection', (socket) => {
  // Guardamos la conexión mientras esperamos su primera solicitud.
  conexionesSinSolicitud.add(socket);

  // La quitamos del conjunto si se cierra.
  // once() ejecuta esta función una sola vez.
  socket.once('close', () => {
    conexionesSinSolicitud.delete(socket);
  });
});

// "request" se ejecuta cuando llega una solicitud HTTP.
server.on('request', (req) => {
  // Esta conexión ya tiene una solicitud.
// Su cierre queda a cargo de server.close().
  conexionesSinSolicitud.delete(req.socket);
});

// Recordamos si el cierre ya comenzó para evitar ejecutarlo dos veces.
let cerrando = false;

// Definimos cómo detener el servidor.
// "signal" identifica la señal que solicitó el cierre.
// Detenemos el servidor al recibir una señal de cierre.
function cerrarServidor(signal) {
  // Evitamos iniciar el cierre más de una vez.
  if (cerrando) {
    return;
  }

  // Marcamos y registramos el comienzo del cierre.
  cerrando = true;
  logger.info({ signal }, 'Iniciando cierre del servidor.');

  // Forzamos la salida si el cierre supera los 10 segundos.
  const limite = setTimeout(() => {
    logger.error('Se agotó el tiempo para cerrar el servidor.');
    process.exit(1);
  }, 10000);

  // El temporizador no mantiene vivo el proceso por sí solo.
  limite.unref();

  // Dejamos de aceptar conexiones nuevas.
  // La función interna se ejecutará cuando termine el cierre.
  server.close((err) => {
    // Cancelamos el temporizador al terminar.
    clearTimeout(limite);

    // Registramos cualquier fallo durante el cierre.
    if (err) {
      logger.error({ code: err.code }, 'Error al cerrar el servidor.');
      process.exitCode = 1;
      return;
    }

    // Confirmamos que el servidor terminó de cerrar.
    logger.info('Servidor cerrado correctamente.');
  });

  // Este bloque está FUERA de la función interna de server.close().
  // Se ejecuta inmediatamente después de solicitar el cierre.
  // Cerramos las conexiones que todavía no enviaron solicitudes.
  for (const socket of conexionesSinSolicitud) {
    socket.destroy();
  }
}

// Ctrl + C genera la señal SIGINT.
process.on('SIGINT', () => cerrarServidor('SIGINT'));

// SIGTERM permite solicitar el cierre desde herramientas del sistema.
process.on('SIGTERM', () => cerrarServidor('SIGTERM'));