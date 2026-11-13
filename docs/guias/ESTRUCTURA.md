# Estructura del proyecto

Los documentos técnicos pertenecen a `CODIGO/docs`. Los módulos de ejecución
conservan su ubicación; esta organización no modifica imports, puertos o datos.

## Raíz del repositorio

| Carpeta o archivo | Contenido |
|---|---|
| [README.md](../../README.md) | Entrada breve, estado de avance y arranque cotidiano. |
| [backend](../../backend) | API, acceso a MySQL y reglas de negocio. |
| [frontend](../../frontend) | Interfaz web y pruebas del navegador. |
| [agente-impresion](../../agente-impresion) | Entrada del agente; su implementación está en backend/scripts. |
| [docs](../README.md) | Guías por tema, operación y cronología. |
| [scripts](../../scripts) | Verificación de documentación del repositorio. |
| `package.json` / `package-lock.json` | Metadatos y comandos de mantenimiento de raíz; las aplicaciones tienen dependencias propias. |

La carpeta hermana `DOCUMENTACION` contiene SQL y PDF de referencia, fases,
pantallas y material académico/de negocio. No está dentro de este repositorio:
subir `CODIGO` a GitHub no sube automáticamente esos PDF.

## Backend

| Ruta dentro de backend | Qué se encuentra |
|---|---|
| `src/server.js` | Arranque y cierre del servidor. |
| `src/app.js` | Express, middlewares, protección HTTP y montaje de rutas. |
| `src/routes/` | Endpoints y permisos necesarios. |
| `src/controllers/` | Traducción de solicitudes/respuestas y errores HTTP. |
| `src/services/` | Reglas, transacciones, snapshots, compras, pedidos y reportes. |
| `src/validators/` | Validación de entradas antes de operar. |
| `src/models/` | Modelos Sequelize, asociaciones y tablas existentes. |
| `src/security/` | Contraseñas, token, cookie, sesión, CSRF y techo de permisos. |
| `src/middlewares/` | Autenticación, autorización y controles compartidos de solicitudes. |
| `src/config/` | Validación del entorno, conexiones y migrador. |
| `src/realtime/` / `src/workers/` | Canal KDS, eventos y publicación del outbox. |
| `migrations/` / `seeders/` | Evolución del esquema y datos iniciales. |
| `scripts/` | Migraciones, cuentas locales, cargas de carta/recetas y agente. |
| `data/` | Datos de carga y referencias estructuradas del negocio. |
| `tests/` | Pruebas puras e integración MySQL con fixtures. |

Flujo habitual: ruta y permisos → controlador/validador → servicio → modelos/MySQL.
El cobro y el registro de un pedido son transacciones separadas. Los eventos
durables se publican después del commit. Ver [pedidos](../operacion/PEDIDOS.md)
y [KDS](../cocina/KDS_BACKEND.md).

## Frontend

| Ruta dentro de frontend | Qué se encuentra |
|---|---|
| `src/App.jsx` | Rutas y composición de la aplicación. |
| `src/routes/` | Comprobación de sesión y entrada a secciones autorizadas. |
| `src/layouts/` | Cabecera, menú y zona de contenido. |
| `src/pages/` | Pantallas de cada módulo. |
| `src/components/` | UI compartida y componentes de negocio por carpeta. |
| `src/services/` | Llamadas HTTP y contratos de respuesta. |
| `src/hooks/` | Consultas cancelables y comportamiento reutilizable. |
| `src/stores/` | Identidad en memoria, carrito y journal comercial. |
| `src/utils/` | Cálculo, validaciones, accesos y exportaciones. |
| `src/styles/`, `index.css`, `theme.css` | Estilos de módulos, base y temas. |
| `src/assets/` | Recursos visuales y fuentes locales. |
| `tests/` | Pruebas de reglas y automatización de navegador. |
| `vite.config.js` | Desarrollo, puerto y proxy HTTP/WebSocket. |

El journal conserva identidades de operaciones para recuperar respuestas
perdidas; los datos oficiales de ventas e inventario están en el servidor.
Las reglas del menú están en [accesos.js](../../frontend/src/utils/accesos.js),
pero el backend valida de nuevo sus permisos.

## Documentación

`guias` explica el proyecto; `seguridad`, `catalogo`, `inventario`, `clientes`,
`operacion`, `cocina` y `reportes` reúnen los módulos. `historial` conserva el
contexto de las fases anteriores. [Índice de guías](../README.md).
