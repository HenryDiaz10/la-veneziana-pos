# Fases 37 y 38 - Cocina y despacho

Abrir `/cocina` desde el menú, con sesión y permiso `kds/operar`. Se reutiliza
AdminLayout, Modal nativo, autenticación, cliente API y tema claro/oscuro.
Sin dependencias nuevas. Arranque: `npm.cmd run dev` en backend y frontend.

## Operación

Tarjetas por tarea/componente con cantidad, producto, variante, pedido, destino,
opciones/exclusiones, indicaciones y fechas oficiales. Cada componente mantiene
su identidad, aunque provenga de la misma línea. No crea ni duplica ventas.
Filtrar área, etapa o producto/pedido/mesa no realiza escrituras.

En pantallas grandes: cuatro etapas; en laptop: dos columnas; en móvil: lista
vertical. Selector de etapa y botones de 44 px permiten operar con tacto y
teclado, sin depender de arrastre. Confirmar en diálogo accesible antes de enviar.
Listo para entregar no significa entregado.

- Cocina: espera -> preparando -> horno opcional -> listo_para_entrega -> entregado.
- Despacho: espera -> entregado. Consume la bebida al confirmar entrega.
- Cancelar tarea exige motivo. Antes de iniciar libera la reserva. Después,
  exige ID de autorización vigente aprobada por administración para ese actor
  y esa tarea; conserva el consumo histórico. Ver contrato backend.
- Cancelar preparación **no anula ni descuenta la línea comercial**, no devuelve
  dinero ni repone stock. Una devolución es otro flujo autorizado.

## Estado oficial y recuperación

WebSocket nativo usa la URL de API configurada, con ws/wss y cookie HttpOnly,
sin credenciales en URL. Primero suscribir y cargar la colección paginada.
Los avisos recibidos durante la carga obligan a repetir el snapshot; sus UIDs
se deduplican en un conjunto acotado a 2000 entradas. Un aviso es invalidación,
no estado aplicable. Recuperar una colección completa también elimina terminales.

Reconexión con demora exponencial limitada a 30 s, nueva colección al conectar,
consulta de respaldo cada 30 s y al recuperar foco/visibilidad/conexión. Si WS
falla pero HTTP funciona se indica «Consulta periódica». No se promete latencia.
Las consultas fallidas conservan las tarjetas para lectura y bloquean acciones;
fallos temporales no producen logout. 401 comprueba sesión; 403 bloquea acceso.

Cada comando captura ID, versión, cuerpo y UUID. Se guarda **antes** del POST
en sessionStorage separado por empleado. No almacena JWT, cookies ni contraseñas.
Incluye el motivo/ID de aprobación cuando corresponde, no credenciales de aprobación.
Red/5xx dejan el intento pendiente: el botón reenvía exactamente la misma clave y
cuerpo, también después de F5 en la misma pestaña. No se permite otra operación
hasta resolverlo. Un 409 obliga a consultar la versión oficial antes de confirmar
de nuevo. Respuestas iniciadas antes de un comando confirmado no lo revierten.
Cerrar la pestaña elimina sessionStorage: revisar el estado oficial antes de actuar.

## Archivos y funciones

| Archivo relativo a frontend | Finalidad |
| --- | --- |
| `src/pages/TableroKds.jsx` | Etapas, contadores, filtros, confirmación y cancelación. |
| `src/components/kds/TarjetaKds.jsx` | Cantidad, destino, indicaciones, exclusiones, fechas y acciones. |
| `src/hooks/useTableroKds.js` | Conexión, snapshots serializados, invalidaciones, reconexión y envío recuperable. |
| `src/services/kds.service.js` | URL WS, colección por cursores y POST protegido con clave. |
| `src/utils/kds-tablero.js` | Validación, acciones, destino y mezcla por versión/ID. |
| `src/utils/kds-intento.js` | Leer/guardar/quitar identidad propia del comando en la pestaña. |
| `src/styles/kds.css` | Tema, tarjetas, columnas y adaptación. |
| `src/App.jsx`, `src/layouts/AdminLayout.jsx` | Ruta y enlace por permiso real. |
| `tests/kds.test.mjs`, `tests/kds-navegador.mjs` | Reglas de presentación, recuperación, permisos, eventos y tamaños. |

## Validación

`npm.cmd run test:kds`, `npm.cmd run test:kds:navegador` (con Vite activo),
`npm.cmd run lint` y `npm.cmd run build`. Navegador usa API/WS simulados y datos
sintéticos, sin modificar negocio: paginación, filtros, confirmación sin cambio
optimista, respuesta perdida/F5, reconexión, fallos sin logout, permiso y anchos
320/390/768/1366/1920 en ambos temas. Backend verifica HTTP/WS y MySQL reales
en su prueba propia. Capturas revisadas visualmente en laptop y móvil.

Resumen: `DOCUMENTACION/FASES/FASE_37.pdf` fuera del repositorio CODIGO.
La fase 37 muestra timestamps; la fase 38 incorpora las funciones siguientes.

## Fase 38 - Audio y cronómetros

En «Avisos y tiempos de cocina», pulsar **Activar y probar sonido** y comprobar
que se escucha en el equipo. Web Audio crea su contexto solo en ese gesto, sin
micrófono ni archivos externos. Probar genera un tono breve aunque haya silencio
temporal: es una prueba explícita. Volumen 0-100 %, silencio durante cinco minutos,
reanudar y desactivar sonido disponibles. El silencio no retiene una cola de
sonidos. Subir volumen/reanudar no reproduce avisos perdidos.

Un snapshot autorizado confirma la existencia de nuevas tareas, nunca un payload
de WS sin comprobar. Después de una referencia inicial, las tareas nuevas vistas
durante conexión en vivo producen un aviso agrupado por lote y un tono breve.
UIDs de eventos y un conjunto acotado de IDs de tareas evitan repeticiones.
Las ráfagas se agrupan sin superponer tonos. Cambiar versión/etapa no anuncia
otra preparación. El contador/texto del último aviso funciona sin sonido.

Primera carga, F5, reconexión, fallo de consulta y regreso desde segundo plano
establecen una referencia silenciosa: no alarmar todo lo pendiente. Las respuestas
de una conexión/referencia anterior se descartan. Si solo funciona HTTP se
actualiza el tablero sin alertar por una supuesta llegada en vivo. No se acumulan
avisos de audio con la pestaña oculta. Cada pestaña es independiente: para evitar
sonidos duplicados en un mismo equipo, habilitar sonido en un solo tablero.

### Reloj y recordatorios

Una muestra `servidor_en` válida de la API se ancla al `performance.now()` de su
recepción. Un solo temporizador de un segundo actualiza todas las tarjetas.
No se suman ticks ni se usa la hora de Windows para calcular el transcurrido.
El tiempo es aproximado: latencia, suspensión y políticas del navegador limitan
precisión/ejecución; foco, visibilidad y consultas periódicas renuevan la muestra.
Una consulta fallida conserva la referencia y la etiqueta sin actualización.

Cada tarea muestra tiempo total desde `enviado_en` y tiempo de etapa desde:

| Etapa | Inicio oficial | Recordatorio inicial orientativo |
| --- | --- | --- |
| Espera | enviado_en | 10 minutos |
| Preparando | iniciado_en | 15 minutos |
| Horno | horno_en | 10 minutos |
| Listo para entregar | listo_en | 5 minutos |

El horno nunca comienza al recibir el pedido. Fechas ausentes o posteriores a
la referencia muestran inicio no conciliado, sin inventar cero o un umbral.
Recordatorios editables entre 1 y 180 minutos por etapa, independientes del audio.
No son recetas, tiempos garantizados ni prueba de que una pizza esté quemada.
Superar el umbral añade borde, texto e icono estáticos: sin parpadeos ni alarmas
repetitivas. No anunciar cada segundo por lector de pantalla. Se respeta
`prefers-reduced-motion`; los controles siguen disponibles con teclado/tacto.

Volumen y umbrales se guardan en localStorage por usuario, con validación y
valores iniciales ante corrupción. Sin datos de pedidos/credenciales; no persisten
habilitación del contexto ni silencio. Se requiere volver a activar audio tras
F5. Al salir se liberan contexto, voces, temporizador y listeners. No se agregan
dependencias, rutas de escritura, cambios de inventario ni tablas.

### Archivos y pruebas de fase 38

| Archivo nuevo relativo a frontend | Responsabilidad |
| --- | --- |
| `src/utils/kds-tiempo.js` | Muestra/hora monotónica, tiempos por etapa, formato, preferencias y detección de tareas nuevas. |
| `src/services/kds-audio.js` | Activación por gesto, volumen, tono con envolvente, agrupación y liberación de voces/contexto. |
| `src/hooks/useRelojKds.js` | Único reloj visual y actualización al cambiar visibilidad. |
| `src/hooks/useAvisosKds.js` | Preferencias, habilitación, prueba, silencio temporal y consumo único de avisos. |
| `src/components/kds/AvisosKds.jsx` | Controles, estado visual y recordatorios configurables. |
| `src/components/kds/TiempoKds.jsx` | Duración por etapa/total e indicación estática de revisión. |
| `tests/kds-tiempo.test.mjs` | Siete casos puros de tiempo, umbrales, referencia silenciosa y ciclo de audio. |
| `tests/kds-avisos-navegador.mjs` | Audio Web real instrumentado, reloj simulado y API/WS sintéticos; ningún POST. |

Se actualizan servicio de colección (ahora devuelve `{tareas, reloj}`), hook de
tablero, página, tarjeta, estilos, scripts y README. La regresión de fase 37
espera a la página denegada antes de contar consultas: no confunde una petición
ya en vuelo con una iniciada por la página sin acceso.

Validación: `npm.cmd run test:kds`, `npm.cmd run test:kds:navegador`,
`npm.cmd run test:kds:avisos`, `npm.cmd run lint` y `npm.cmd run build`.
El escenario de avisos comprueba activación sin autoplay, volumen/cero/silencio
y vencimiento, repetición/reconexión/F5, bloqueo de audio, reloj del sistema
cambiado y tiempos de horno separados. Cinco tamaños (320/390/768/1366/1920),
ambos temas y reduced-motion sin desbordamiento. El entorno headless comprueba
el grafo/programación de Web Audio; no confirma altavoces físicos ni volumen
audible real: usar el botón de prueba en el dispositivo de cocina.

Referencias: [Web Audio y gesto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API),
[reloj monotónico](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now).
PDF: `DOCUMENTACION/FASES/FASE_38.pdf`. Siguiente: fase 39, consultas gerenciales.
