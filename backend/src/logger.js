// Importamos Pino, la biblioteca que instalamos
// para generar registros estructurados en formato JSON.
import pino from 'pino';

// Creamos un logger compartido.
// Los demás archivos podrán importarlo para registrar mensajes.
const logger = pino({
  // Identifica qué aplicación generó cada registro.
  name: 'la-veneziana-backend',

  // Define el nivel mínimo de los mensajes que se mostrarán.
  // "info" permite mostrar información, advertencias y errores.
  level: 'info',

  // Configuramos campos que deben eliminarse de los registros.
  // Estas reglas se aplican a las rutas indicadas dentro
  // de los objetos que enviemos al logger.
  redact: {
    // Excluimos credenciales y encabezados que podrían
    // contener tokens o cookies de sesión.
    paths: [
      'password',
      'pin',
      'token',
      'req.headers',
      'res.headers'
    ],

    // Eliminamos esos campos del registro generado.
    // Esto no modifica los datos originales de la solicitud.
    remove: true
  }
});

// Exportamos el logger para utilizarlo desde otros archivos.
export default logger;