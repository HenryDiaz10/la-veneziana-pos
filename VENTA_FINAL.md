# Fase 30 · Venta confirmada y recuperación

Implementada el 23/10/2026. Integra los servicios de fase 28 con la captura de
fase 29. No requiere tablas ni migraciones nuevas; reutiliza idempotencias,
trabajos de impresión y outbox existentes.

## Flujo del operador

1. En POS, personalizar productos e indicaciones y revisar el recibo. Seleccionar
   para llevar, salón con mesa libre o delivery con cliente y dirección. La búsqueda
   exacta de clientes exige `clientes/buscar`. Sin ese permiso se ofrecen llevar
   y salón sin cliente. El servidor vuelve a validar todos los vínculos.
2. Confirmar registro: `pedidos/crear`, precios oficiales, receta y reserva
   atómica. Conserva el carrito y enlaza el pedido existente. No permite volver
   a registrar ese borrador mientras su pedido sigue pendiente de cobro.
3. Seguir el enlace a Pagos. Abrir sesión propia de caja con fondo inicial si
   corresponde (`caja/gestionar`). La apertura no es una venta.
4. Distribuir pago adquiere checkout con versión y clave propia, consulta el
   contexto vigente y abre el modal. Cancelar libera el bloqueo; también existe
   «Liberar pedido sin cobrar». Navegar o cerrar el navegador deja expirar el
   bloqueo a los cinco minutos. Actualizar descarta la distribución capturada.
5. Preparar solo revisa. «Confirmar cobro» envía la distribución al servidor:
   exige caja propia, checkout vigente y versión; no envía total ni impuesto.
   FINANZAS pendiente bloquea el cobro; no se inventa tasa ni emisión SUNAT.
6. Confirmación 200/201 o recuperación oficial: muestra la venta y retira solo
   las líneas originales cuya selección no cambió. Conserva líneas nuevas o
   editadas. Una falla de impresión no revierte ni vuelve a cobrar una venta.

Delivery conserva el total de productos: no agrega una tarifa automática.
Las tareas de cocina quedan persistidas; KDS en vivo sigue en su fase prevista.

## Desconexión, F5 y pestañas

`comercial.store.js` registra **antes del POST** una clave por operación, tipo,
pedido y huellas SHA-256 de las líneas originales. Nunca persiste el comando,
referencias de billetera, datos del cliente, contraseña o cookie. Las referencias
digitales solo viven en memoria; tras una recarga se capturan otra vez si el
intento anterior fue cancelado sin efectos.

Una operación desconocida bloquea nuevas operaciones comerciales de ese usuario.
«Recuperar resultado» consulta su identidad original. Un 404 no demuestra que
el POST haya fallado: «Resolver intento pendiente» espera la misma barrera de
usuario del servidor, recupera el commit o guarda una cancelación permanente
para esa identidad. Un POST atrasado con esa clave queda rechazado. Nunca se
borra la incertidumbre solo por un temporizador ni se reenvía un cobro con otra clave.

Web Locks serializa pestañas del mismo origen y usuario. Se exige navegador
actualizado, HTTPS o localhost y almacenamiento disponible antes de enviar.
Cada operación verifica identidad; un cambio de usuario no limpia su carrito.
Si otro cajero cobró el pedido, su propietario puede consultar el estado pagado
y usar «Recuperar cobro confirmado y limpiar borrador», sin enviar otro cobro.
No sustituye los controles transaccionales del servidor ni bloquea otros dispositivos.

## Impresión durable y agente

`encolarTicket` crea el trabajo y su evento outbox dentro de la transacción del
cobro. Congela líneas, variantes, modificadores, notas, importes y vuelto;
excluye referencias bancarias y datos privados del cliente. Recuperar la venta
devuelve el mismo `job_uid`. Un fallo al encolar revierte la transacción completa.

El agente de una pasada consulta exclusivamente trabajos propios autenticados,
con permiso `ventas/cobrar`. No abre un servidor local ni permite acceso a
impresoras desde Internet. Genera un `.txt` UTF-8 por `job_uid`, en creación
exclusiva; si se reinicia o pierde el ACK verifica el archivo antes de repetir
la misma confirmación idempotente. Si hay un archivo incompleto/diferente se
detiene para revisión en lugar de sobrescribirlo. No imprime dos veces.

Configuración del proceso, sin guardarla en Git:

| Variable | Uso |
|---|---|
| `IMPRESION_API_URL` | API HTTPS o localhost; predeterminado `http://localhost:3000/api`. |
| `IMPRESION_ORIGEN` | Origen permitido por el backend; predeterminado `http://localhost:5173`. |
| `IMPRESION_COOKIE` | Cookie de sesión vigente del operador autorizado, solo en memoria del proceso. No copiarla a documentación, argumentos, registros ni `.env` versionados. |
| `IMPRESION_CARPETA` | Carpeta local de salida, preferiblemente fuera del repositorio. |
| `IMPRESION_ANCHO` | `58` o `80`; predeterminado `80` (32/48 columnas). |

Desde `CODIGO/backend`: `npm.cmd run impresion:simular`.

**Alcance:** solo simulación validada. Estado `pendiente` significa en cola;
`enviado` significa archivo simulado reconocido, sin papel confirmado.
El agente nunca usa `confirmado`, ESC/POS, corte ni apertura del cajón.
Antes de hardware real se debe implementar y validar su adaptador/modelo,
codificación, ancho, corte y regla de cajón por efectivo; no hay emisión fiscal.
Una sesión vencida o red caída conserva el trabajo sin reintentar una venta.
El outbox es durable; el worker general se incorpora en su fase posterior.

## Archivos y funciones

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/components/pos/RegistrarPedido.jsx` | Atención, mesa/cliente/dirección, confirmación y enlace al pedido. |
| `frontend/src/components/pos/AperturaCaja.jsx` | Consulta de sesión propia y apertura con fondo inicial. |
| `frontend/src/pages/Pagos.jsx` | Checkout, revisión, confirmación, recuperación de cobro previo y estado del ticket. |
| `frontend/src/stores/comercial.store.js` | `ejecutarComercial`, `recuperarComercial`, `reconciliarCobro`: identidad durable y limpieza selectiva. |
| `frontend/src/components/RecuperarOperacion.jsx` | Aviso global de resultado desconocido, recuperación y resolución segura. |
| `frontend/src/services/api.js` | Clave de idempotencia, códigos de error y límite de espera sin asumir éxito/fallo comercial. |
| `backend/src/services/operacion-comercial.js` | `resolverIntento`: barrera por usuario y cancelación de identidades no confirmadas. |
| `backend/src/services/impresion.service.js` | `encolarTicket`, cola/estado propios y ACK simulado idempotente. |
| `backend/src/services/ticket-formato.js` | Formato puro 58/80 mm; elimina caracteres de control del contenido. |
| `backend/scripts/agente-impresion.mjs` | Transporte autenticado y archivo único por trabajo, sin hardware. |

También se actualizan App, PuntoVenta, ModalPagosMixtos, servicios de cobro,
controlador/rutas de pedidos y caja, scripts de pruebas y README.

Rutas añadidas bajo `/api`: `GET /pedidos/registro`,
`POST /pedidos/operaciones/:tipo/:clave/resolver`,
`POST /caja/operaciones/:clave/resolver`,
`GET /pedidos/impresion/pendientes`, `GET /pedidos/impresion/:uid`,
`POST /pedidos/impresion/:uid/simulacion`. Exigen sesión y permisos de la operación;
las escrituras conservan protección CSRF. El contexto de pago también devuelve
el resumen de venta cuando la cuenta ya está pagada.

## Validación

Frontend: `npm.cmd run lint`, `npm.cmd run build`, pruebas unitarias y scripts
`test:pagos:navegador`, `test:cocina:navegador`, `test:comercial:navegador`.
Las pruebas de módulos se ejecutan contra Vite recién iniciado para evitar
instancias distintas de Zustand por URLs de HMR de herramientas de prueba.

Backend: `npm.cmd run test:pedidos:integracion`, `npm.cmd run test:impresion`
y pruebas unitarias existentes. MySQL usa registros temporales con limpieza;
la política fiscal ficticia permanece en una transacción revertida.
Se cubren venta única, rollback del ticket, ACK perdido/reinicio, permisos,
cancelación segura, notas, reserva, respuesta perdida/F5, dos pestañas,
cambio de usuario, almacenamiento bloqueado y preservación de líneas editadas.

Resultado de revisión: 33 pruebas unitarias frontend y 26 backend aprobadas,
integración HTTP/MySQL aprobada, cuatro escenarios de navegador (pagos, cocina
y venta completa, recuperación comercial y sesión), lint y build sin errores.

PDF resumido: `DOCUMENTACION/FASES/FASE_30.pdf`, fuera del repositorio CODIGO.
Siguiente fase: 31, backend del cierre Z y devoluciones.
