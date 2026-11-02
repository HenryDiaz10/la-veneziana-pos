# Fases 36 y 37 - Eventos y operación KDS

El servicio registra tareas, reservas y eventos de cocina/despacho en la misma
transacción del pedido. Un worker lee eventos confirmados del outbox y publica
notificaciones mediante WebSocket. No se usan hooks de UPDATE SQL como supuesto
disparador de red. La fase 36 prepara la API y el protocolo; la fase 37 añade
el tablero y los comandos documentados al final de este archivo.

## Arranque y alcance

Desde backend, con las dependencias instaladas y MySQL local configurado:

```powershell
npm.cmd run dev
```

`src/server.js` inicia el canal y el worker al escuchar HTTP. No hace falta otro
proceso ni puerto: `/api/kds/ws` comparte `PORT` (3000 por defecto) con la API.
Vite (5173) reenvía `/api` con `ws: true`; en producción el proxy debe permitir
el upgrade en esa ruta y usar HTTPS/WSS. La nueva dependencia backend es
`ws` 8.22.0, fijada en package.json/package-lock; el navegador usará WebSocket nativo.
Referencia de la biblioteca: [ws](https://github.com/websockets/ws).

Se utiliza **una instancia Node** con su worker y canal en memoria. No se ofrece
fanout entre varios servidores: para cluster o varias réplicas hace falta un
broker compartido y coordinación de consumidores antes de escalar. Dos lectores
concurrentes del outbox no reclaman la misma fila, pero eso no replica los sockets
de otra instancia. No se modifican tablas, migraciones ni FINANZAS.

## Transacción y publicación

1. `crearPedido`/`ampliarPedido` crean las tareas y reservan insumos. Separan IDs
   de cocina y despacho según el canal congelado de la preparación.
2. Guardan `pedido.cocina` y/o `pedido.despacho`, destino `kds`, dentro de la
   misma transacción. Una respuesta idempotente no vuelve a crear tareas/eventos.
3. El worker selecciona hasta 20 eventos vencidos por lote, ordenados por ID.
   Solo procesa esos dos tipos de la sala KDS; deja intactos caja, impresión,
   salón y otros eventos comerciales.
4. MySQL 8 usa `FOR UPDATE SKIP LOCKED` explícito: Sequelize 6 omite esa opción
   en el dialecto MySQL. La consulta parametriza tipos, fechas, límite e IDs.
   No espera las filas aún bloqueadas por una transacción de pedido sin commit.
5. Publicar envía una notificación mínima a conexiones autorizadas. Después
   registra `publicado_en`, intentos y próxima fecha en la transacción del lote.
6. Un fallo conserva el evento pendiente y programa reintento exponencial
   (1, 2, 4... hasta 60 segundos, más precisión de segundos y frecuencia de sondeo).
   El sondeo nominal es de 1 segundo, sin lotes superpuestos. No se promete una
   latencia exacta. Un evento inválido se retiene para revisión y no impide
   procesar otros vencidos del lote.

Fechas SQL y comparación se hacen en UTC. Las fechas se envían como texto UTC
al SQL parametrizado, evitando que `replacements` de Date use la zona local del
proceso. La programación redondea hacia arriba por la precisión TIMESTAMP del SQL.

La entrega es **al menos una vez en el intento de publicación**, no exactly-once
ni confirmación de lectura humana. Caer después del envío y antes de guardar la
marca puede repetir el mismo `event_uid`. El receptor deduplica ese UID y vuelve
a consultar el estado oficial. El callback de socket no demuestra procesamiento
por el tablero. Sin conexiones se marca el intento publicado; los clientes
posteriores recuperan tareas por HTTP, no por reproducción del historial de red.

## Autenticación y límites del canal

- Ruta exacta `/api/kds/ws`, sin query params ni tokens en URL.
- Cookie HttpOnly vigente, usuario activo y permiso `kds/operar`, consultados en
  MySQL con el mismo verificador que HTTP. No se confía en permisos del navegador.
- Origin debe coincidir exactamente con `CORS_ORIGIN`; se comprueba en el upgrade.
- Antes de cada publicación se revisa el acceso. Ping/revisión nominal cada
  15 segundos también detecta pérdida de conexión, revocación, rol y vencimiento.
  La conexión no renueva ni extiende el plazo de ocho horas de la sesión.
- Hasta 200 conexiones por proceso, 10 por usuario y 30 autenticaciones de
  upgrade simultáneas; timeout de upgrade de 5 segundos. Sin compresión y con
  límite entrante de 1024 bytes. Un cliente con cola de salida superior a 64 KiB
  se desconecta para recuperar por snapshot.
- Canal solo de avisos: enviar mensajes de aplicación cierra con 1008 y no
  modifica tareas ni inventario. Los comandos futuros serán REST con CSRF,
  permiso, versión e idempotencia.

HTTP del upgrade rechaza 401/403/404 y limita capacidad con 429/503. Cierre 1008
indica revisar sesión/permiso; un fallo de verificación puede cerrar con 1011;
una conexión lenta, con 1013. Se requiere volver a autenticar o reconectar según
el caso. No se registran cookies, tokens, notas o SQL en el worker.

Al detener el servidor se frenan lotes y timers, se cierran sockets y se espera
el envío activo y las verificaciones de identidad antes de cerrar MySQL.

## Mensajes de protocolo 1

Al conectar:

```json
{"protocolo":1,"tipo":"kds.conectado","requiere_snapshot":true,"servidor_en":"fecha UTC"}
```

Una notificación contiene `protocolo`, `tipo`, `event_uid`, `pedido_id`, `version`,
`canal`, `tareas` y `servidor_en`. IDs de pedidos/tareas son strings BIGINT exactos.
`version` corresponde al pedido que originó el aviso; no se usa como versión
de la tarea. Cada tarea tiene su propia versión en HTTP. No se reenvía el JSON
completo del outbox ni se incluyen costos, recetas, precios o datos de clientes.

## API de recuperación

Todas las rutas requieren sesión y `kds/operar`, con `Cache-Control: no-store`:

| Método y ruta | Resultado |
| --- | --- |
| `GET /api/kds/tareas` | Página de tareas activas, paginación y hora del servidor. |
| `GET /api/kds/tareas/:id` | Una tarea visible, incluidos estados finales, para reconciliar un aviso. |

Parámetros de colección: `canal` = cocina/despacho/todos (predeterminado todos),
`limite` entre 1 y 200 (predeterminado 100), `desde` y `hasta` como IDs positivos
decimales BIGINT. Campos inesperados, arrays o cursores inválidos producen 400.
Sin sesión 401; sin permiso 403; tarea no visible/inexistente 404. Preparación
incoherente se rechaza como conjunto en lugar de mostrar parcialmente sus datos.

La página devuelve `paginacion.hasta` como límite superior de creación y
`paginacion.siguiente` como cursor o null. Reutilizar canal, hasta y siguiente
para recorrer las páginas, ordenadas por ID. Cada página es coherente bajo
REPEATABLE READ; el conjunto de varias páginas no es una transacción congelada.
Se filtran por estado de tarea espera/preparando/horno/listo_para_entrega;
entregadas/canceladas no aparecen en la colección, pero sí en detalle.

Cada tarea expone ID, línea, componente, cantidad, versión/estado, canal, nombre,
variante, opciones/exclusiones, notas, fechas del servidor y destino del pedido
(salón/mesa, llevar o delivery). Sin dirección, teléfono, costos, ingredientes
de BOM o importes de venta. Los componentes son tareas independientes con IDs
distintos; consultar/publicar no crea otra venta ni duplica ingresos.

### Contrato para el tablero de fase 37

1. Conectar con la cookie vigente y recibir `kds.conectado`.
2. Empezar a guardar los avisos recibidos mientras se carga la colección completa
   por páginas. Suscribirse antes evita un hueco entre snapshot y altas nuevas,
   incluso si una transacción con ID menor confirma tarde.
3. Deduplicar `event_uid`; consultar los IDs afectados y combinar por ID/versión
   de tarea, conservando la versión más nueva. Reconciliar también estados finales.
4. En reconexión, sustituir el estado base mediante una colección completa nueva;
   no asumir replay del socket ni sonar por todo el historial. Reconciliar avisos
   acumulados durante la carga. Repetir consulta completa al recuperar visibilidad
   o ante incertidumbre; las notificaciones son invalidaciones, no la base de datos.

La fase 36 no consume inventario por recibir/publicar un aviso ni marca entregas.
La fase 37 incorpora las transiciones descritas abajo.

## Archivos y funciones

| Ruta bajo backend | Responsabilidad |
| --- | --- |
| `src/services/kds-protocolo.js` | Validar consulta, proyectar tarea, construir notificación mínima y calcular demora de reintento. |
| `src/services/kds.service.js` | Consultar colección/detalle con páginas coherentes y relaciones obtenidas en lote. |
| `src/routes/kds.routes.js` | Autenticación/permiso y respuestas de consulta. |
| `src/realtime/kds.js` | Upgrade, acceso, límites, ping, publicación y cierre de conexiones. |
| `src/workers/kds-outbox.js` | Reclamar filas confirmadas, publicar/reintentar y detener sin lotes pendientes. |
| `src/middlewares/autenticar.js` | `autenticarTokenSesion` compartido por HTTP/WS; conserva validación de sesión y plazo absoluto. |
| `src/services/pedidos.service.js`, `operacion-comercial.js` | Guardar eventos cocina/despacho en la transacción y sala correctas. |
| `src/server.js`, `app.js` | Ciclo de vida del canal/worker y registro de API. |
| `tests/kds-protocolo.test.mjs`, `kds-integracion.mjs` | Contrato, privacidad, WebSocket/MySQL, rollback, concurrencia y recuperación. |

También se actualizan package.json/lockfile, README principal/frontend,
PEDIDOS.md y `frontend/vite.config.js` (proxy WebSocket).

## Validación

Desde backend:

```powershell
npm.cmd run test:kds
npm.cmd run test:kds:integracion
npm.cmd run test:sesion:integracion
npm.cmd run test:pedidos:integracion
npm.cmd run test:modificadores:integracion
```

Integración contra MySQL 8 local (probado 8.4.11), con fixtures propias y sin
otro worker de desarrollo procesando la misma base. El filtro interno de IDs
del lote evita tocar eventos de negocio ajenos a la prueba; no es un parámetro
HTTP. Se retiran usuarios, pedidos, reservas, tareas y eventos temporales.
No se cambia FINANZAS. Las regresiones fiscales usan su transacción revertida.

Se comprobaron ausencia de publicación antes de commit/rollback, cocina y
despacho, dos lectores, reintento UTC, repetición del mismo UID tras marca fallida,
evento inválido sin frenar otro válido, componentes y estados finales, privacidad,
origen/sesión/permiso, revocación/rol/vencimiento, reconexión y cierre mientras
hay publicación o autenticación en curso. Sin tablero aún no se prueba UX KDS.

Desde frontend: `npm.cmd run lint` y `npm.cmd run build`.
Resumen PDF fuera de Git: `DOCUMENTACION/FASES/FASE_36.pdf`.
Tablero disponible desde fase 37; siguiente: fase 38, audio y cronómetros.

## Fase 37 - Comandos operativos

`POST /api/kds/tareas/:id/transiciones`, sesión y `kds/operar`, Origin/CSRF,
cabecera `Idempotency-Key` (8-64 caracteres), cuerpo `{version, estado}`.
Cancelar añade `motivo` (3-500 caracteres) y, si ya comenzó, `autorizacion_id`.
No aceptar usuario, precio, recetas, consumos ni fechas enviados por navegador.
Respuesta: `{tarea, servidor_en, repetida}`. El detalle se proyecta dentro de la
misma transacción. 400 datos, 401/403 acceso, 404 tarea, 409 versión/estado/stock/
autorización. Misma clave/cuerpo devuelve la respuesta original; otro cuerpo con
esa clave se rechaza. Ante respuesta perdida, reenviar la misma operación.

### Transiciones e inventario

| Canal / origen | Destinos permitidos |
| --- | --- |
| Cocina / espera | preparando, cancelado |
| Cocina / preparando | horno, listo_para_entrega, cancelado |
| Cocina / horno | listo_para_entrega, cancelado |
| Cocina / listo_para_entrega | entregado, cancelado |
| Despacho / espera | entregado, cancelado |
| Entregado o cancelado | Ninguno |

Preparar cocina y entregar despacho convierten reserva en consumo en la misma
transacción. Las otras etapas no consumen de nuevo. Cada transición incrementa
versión y registra fecha de su etapa, `kds_historial`, auditoría y `kds.actualizada`
con canal congelado e ID de tarea. Worker/protocolo ahora admiten este tercer tipo.
En ese aviso `version` es de tarea; los avisos pedido.cocina/despacho conservan
versión de pedido. El cliente nunca compara versiones de entidades distintas.

Bloqueos: barrera de actor/idempotencia, línea y tarea, luego inventario por IDs
ordenados; cancelación toma antes la barrera de seguridad. Nunca bloquear pedido
después de la tarea. La línea coordina los componentes y actualiza su resumen
`estado_kanban` con la etapa más temprana de los no cancelados, o null si todos
se cancelaron; conserva la marca listo al alcanzarla. `estado_item` y total de
cuenta no se anulan: cancelar tarea solo detiene esa preparación. No cobra,
descuenta ni devuelve; la rectificación comercial requiere su flujo propio.

Cancelar en espera libera reserva sin entrada ficticia de Kardex. Cancelar tras
inicio conserva reserva consumida/costo/Kardex y exige aprobación de un solo uso
para `kds/cancelar`, entidad `kds_tareas`, ID exacto de tarea y actor de sesión.
Crear con la API existente de autorizaciones (`POST /api/autorizaciones`, ver
su router), aprobador con seguridad/gestionar y kds/operar; actor con kds/operar.
No basta conocer un ID ajeno/vencido/consumido. Una falla revierte el consumo
de la autorización junto con estado, historial y evento. Terminales no retroceden.

Archivos nuevos: `services/kds-reglas.js` valida cuerpo y máquina de estados;
`services/kds-comandos.service.js` orquesta transacción/consumo/liberación/historial;
`tests/kds-reglas.test.mjs` y `tests/kds-comandos-integracion.mjs` verifican reglas,
HTTP/MySQL/WS, concurrencia, identidad, stock, aprobación y rollback tardío.
Se amplían router, servicio de consultas (transacción compartida), políticas,
mensajes de error, outbox y protocolo sin migraciones ni dependencias nuevas.

Pruebas: `npm.cmd run test:kds` y `npm.cmd run test:kds:comandos`; regresión
`npm.cmd run test:kds:integracion`. Solo fixtures locales propias, retiradas al
terminar; no cambiar FINANZAS. No ejecutar otro worker sobre la misma BD durante
integración. Tablero y recuperación de pestaña: [frontend/KDS.md](../frontend/KDS.md).
PDF resumido: `DOCUMENTACION/FASES/FASE_37.pdf`, fuera de Git.
