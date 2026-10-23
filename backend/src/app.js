// Importamos Express, la biblioteca que permite crear
// nuestra aplicación web y definir sus rutas.
import express from 'express';

// Importamos el middleware que registra las solicitudes HTTP.
import pinoHttp from 'pino-http';

// Importamos el logger compartido que configuramos.
import logger from './logger.js';

// Importamos el middleware que configura los encabezados CORS.
import cors from 'cors';

// Importar la configuración validada para configurar CORS.
import { env } from './config/env.js';

// Importar la instancia compartida de Sequelize.
import { sequelize } from './config/database.js';

import authRouter from './routes/auth.routes.js';
import pedidosRouter from './routes/pedidos.routes.js';
import cajaRouter from './routes/caja.routes.js';
import salonRouter from './routes/salon.routes.js';
import kdsRouter from './routes/kds.routes.js';
import devolucionesRouter from './routes/devoluciones.routes.js';

import usuariosRouter from './routes/usuarios.routes.js';

import rolesRouter from './routes/roles.routes.js';

import categoriasRouter from './routes/categorias.routes.js';

import autorizacionesRouter from './routes/autorizaciones.routes.js';

import productosRouter from './routes/productos.routes.js';

import modificadoresRouter from './routes/modificadores.routes.js';
import clientesRouter from './routes/clientes.routes.js';
import recetasRouter from './routes/recetas.routes.js';
import inventarioRouter from './routes/inventario.routes.js';
import comprasRouter from './routes/compras.routes.js';
import posRouter from './routes/pos.routes.js';

// Leer las cookies recibidas sin registrar su contenido.
import cookieParser from 'cookie-parser';

import { protegerCsrf } from './middlewares/protegerCsrf.js';

// Creamos una aplicación Express.
// La constante "app" nos permite configurarla y agregar rutas.
const app = express();

// Registramos las solicitudes antes de procesar sus datos y rutas.
// Así podemos medir el tiempo que tarda en responder la aplicación.
app.use(pinoHttp({
  // Utilizamos la configuración del logger compartido.
  logger,

  // Los serializers seleccionan qué datos guardar en el registro.
  serializers: {
    // Elegimos los datos que registraremos de cada solicitud.
    req(req) {
      return {
        // Identificador asignado por pino-http a la solicitud.
        id: req.id,

        // Método HTTP utilizado, por ejemplo GET o POST.
        method: req.method,

        // Conservamos la ruta y quitamos los parámetros tras "?".
        // Así evitamos registrar los valores enviados en la consulta.
        path: req.url.split('?')[0]
      };
    },

    // Elegimos los datos que registraremos de la respuesta.
    res(res) {
      return {
        // Código HTTP: por ejemplo, 200 significa respuesta correcta.
        statusCode: res.statusCode
      };
    }
  }
}));

// Permitir cookies únicamente desde el origen configurado.
app.use(cors({
  origin: env.origenFrontend,
  credentials: true
}));

// Evitar que se almacenen respuestas de la API.
// Colocarlo antes del lector JSON para cubrir también
// los errores de formato y de tamaño del cuerpo.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Interpretar las cookies antes de ejecutar las rutas.
app.use(cookieParser());

// Proteger todas las operaciones que modifican datos en la API.
app.use('/api', protegerCsrf);

// Interpretar el cuerpo JSON después de comprobar el origen.
app.use(express.json());

// Definimos una ruta de consulta mediante el método HTTP GET.
// "/" representa la dirección principal del servidor.
// La función se ejecuta cuando llega una solicitud GET a esa ruta.
//
// req: contiene información de la solicitud recibida.
// res: permite enviar una respuesta al cliente.
app.get('/', (req, res) => {
  // Respondemos con un objeto convertido a formato JSON.
  // "mensaje" es el nombre del campo y el texto es su valor.
  res.json({
    mensaje: 'Hola Mundo. Servidor de La Veneziana funcionando.'
  });
});

// Creamos una ruta para comprobar que el servidor está activo.
// Más adelante podrá utilizarla una herramienta de monitoreo.
app.get('/health', (req, res) => {
  // Respondemos con el código HTTP 200: solicitud correcta.
  // json() convierte el objeto en una respuesta JSON.
  res.status(200).json({
    // Indicamos que la aplicación puede responder solicitudes.
    estado: 'ok',

    // Identificamos el servicio que estamos comprobando.
    servicio: 'la-veneziana-backend'
  });
});

// Comprobar si el backend puede consultar la base de datos.
app.get('/ready', async (req, res) => {
  // Evitar que se conserve una respuesta antigua de disponibilidad.
  res.set('Cache-Control', 'no-store');

  try {
    // authenticate ejecuta una consulta de comprobación.
    // Sequelize obtiene y libera la conexión mediante su pool.
    await sequelize.authenticate();

    // La base respondió: el servicio está disponible.
    res.status(200).json({
      estado: 'disponible',
      baseDeDatos: 'conectada'
    });
  } catch (error) {
    // Registrar solo identificadores del fallo, sin credenciales ni SQL.
    logger.warn(
      {
        errorName: error.name,
        code: error.original?.code,
        requestId: req.id
      },
      'La comprobación de disponibilidad de MySQL falló.'
    );

    // La base no respondió, pero el proceso HTTP continúa funcionando.
    res.status(503).json({
      estado: 'no_disponible',
      baseDeDatos: 'no_disponible'
    });
  }
});

// Registrar las rutas de autenticación.
app.use('/api/auth', authRouter);

app.use('/api/usuarios', usuariosRouter);

app.use('/api/roles', rolesRouter);

app.use('/api/autorizaciones', autorizacionesRouter);

// Catálogo: categorías protegidas por sesión y permiso.
app.use('/api/categorias', categoriasRouter);
// Este middleware se ejecuta cuando ninguna ruta anterior respondió.
// Debe colocarse después de todas las rutas de la aplicación.

// Administración de productos con sesión y permiso de catálogo.
app.use('/api/productos', productosRouter);

// Administración de grupos de modificadores.
app.use('/api/modificadores', modificadoresRouter);

// Búsqueda limitada y administración autorizada de clientes y direcciones.
app.use('/api/clientes', clientesRouter);

// Recetas y deltas: datos maestros; no realizan movimientos de inventario.
app.use('/api/recetas', recetasRouter);
// Monitor de solo consulta: saldos, historial y conciliación.
app.use('/api/inventario', inventarioRouter);
app.use('/api/compras', comprasRouter);

// Catálogo y consultas operativas del punto de venta con permiso ventas/cobrar.
app.use('/api/pos', posRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/caja', cajaRouter);
app.use('/api/salon', salonRouter);
app.use('/api/kds', kdsRouter);
app.use('/api/ventas', devolucionesRouter);

app.use((req, res) => {
  // El código HTTP 404 indica que el recurso solicitado no existe.
  // Respondemos en JSON para mantener el formato de nuestra API.
  res.status(404).json({
    // Ofrecemos un mensaje claro para quien realiza la solicitud.
    mensaje: 'Ruta no encontrada.'
  });
});

// Centralizamos los errores que ocurren al procesar solicitudes.
// Express reconoce este middleware por sus cuatro parámetros:
// err: error ocurrido; req: solicitud; res: respuesta;
// next: permite pasar el error al siguiente manejador.
app.use((err, req, res, next) => {
  // Si la respuesta ya comenzó, no podemos enviar otra.
  // Dejamos que Express termine de gestionar el error.
  if (res.headersSent) {
    return next(err);
  }

  // Detectamos un cuerpo JSON con formato incorrecto.
  if (err.type === 'entity.parse.failed') {
    // 400 indica que la solicitud contiene datos incorrectos.
    return res.status(400).json({
      mensaje: 'El cuerpo de la solicitud debe contener JSON válido.'
    });
  }

  // Detectamos un cuerpo que supera el límite permitido.
  if (err.type === 'entity.too.large') {
    // 413 indica que los datos enviados son demasiado grandes.
    return res.status(413).json({
      mensaje: 'El cuerpo de la solicitud supera el tamaño permitido.'
    });
  }

  // Registramos el nombre del error y el identificador de solicitud.
  // Evitamos guardar el cuerpo enviado, que podría contener secretos.
  logger.error(
    { errorName: err.name, requestId: req.id },
    'Error interno al procesar una solicitud.'
  );

  // 500 indica un fallo interno del servidor.
  // Enviamos un mensaje general sin revelar detalles internos.
  res.status(500).json({
    mensaje: 'Error interno del servidor.'
  });
});

// Exportamos la aplicación para importarla desde server.js.
// Este archivo configura la aplicación, pero no abre un puerto.
export default app;
