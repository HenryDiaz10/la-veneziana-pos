# Fase 34 - Backend de mesas y pedidos abiertos

Se reutilizan `zonas_restaurante`, `mesas_salon`, `pedidos_master`, auditoría,
idempotencias y outbox. Sin migraciones, roles nuevos o cambios a FINANZAS.
La interfaz `/salon` permanece de consulta; los botones operativos no están
conectados en esta fase de backend.

## Estados y responsabilidad

| Acción | Origen | Destino | Responsable |
| --- | --- | --- | --- |
| Ocupar sin pedir todavía | `libre`, sin cuenta activa | `ocupada` | Usuario autenticado que ocupa. No se acepta otro ID desde el cliente. |
| Confirmar primer pedido | `libre` o `ocupada` por el mismo actor, sin cuenta activa | `ocupada` | Actor que registra el pedido. |
| Liberar sin cuenta pendiente | `ocupada` | `sucia_por_limpiar` | Se conserva; se exige motivo de al menos 3 caracteres. |
| Cobrar cuenta | `ocupada`, cuenta válida bloqueada por cajero | `sucia_por_limpiar` | Se conserva el mesero; si era null en un pedido antiguo, se usa su creador. |
| Confirmar limpieza | `sucia_por_limpiar`, sin cuenta activa | `libre` | Se limpia la asignación a null. |

`inhabilitada` y null no se convierten automáticamente en mesas utilizables.
No existe salto directo de ocupada a libre. Ocupar sin pedir no crea una cuenta
vacía ni reserva inventario. Cualquier operador con `mesas/gestionar` puede
liberar una ocupación sin cuenta o confirmar una limpieza: no se exige que sea
el responsable anterior; la auditoría conserva quién lo hizo. Esta fase no
incluye transferencia de responsable, cambio de mesa, anulación de cuenta ni
habilitación/deshabilitación administrativa.

Una cuenta activa es `abierta` o `bloqueada_en_pago`, incluso con checkout
vencido. Ambas bloquean ocupar/liberar/limpiar. Para agregar consumo se amplía
el pedido existente; la ampliación de salón exige el responsable de la mesa.
El cajero puede cobrar el pedido del mesero con su propio permiso y sesión.
Las cuentas pagadas/anuladas históricas no bloquean por sí mismas la mesa.

## API

Las rutas `/api/salon` exigen sesión y `mesas/gestionar`.
Los POST además requieren CSRF, origen autorizado y `Idempotency-Key` de 8-64
caracteres alfanuméricos, guion o guion bajo.

| Método y ruta | Resultado |
| --- | --- |
| `GET /salon` | Mapa coherente de zonas/mesas, ahora con revisión y cuenta activa mínima. |
| `GET /salon/mesas/:id` | `{mesa}` con revisión y `pedido_abierto` o null. |
| `POST /salon/mesas/:id/ocupar` | Mesa ocupada por el actor actual, sin crear pedido. |
| `POST /salon/mesas/:id/liberar` | Mesa por limpiar; exige motivo. |
| `POST /salon/mesas/:id/limpiar` | Mesa libre y sin responsable. |
| `GET /salon/operaciones/:tipo/:clave` | Recuperar exclusivamente una operación del actor. |
| `POST /salon/operaciones/:tipo/:clave/resolver` | Cuerpo `{}`. Esperar el resultado en curso o cancelar definitivamente esa identidad. |

Tipos admitidos: `mesa.ocupar`, `mesa.liberar`, `mesa.limpiar`.
Ejemplo de cuerpo de comando:

```json
{
  "revision": "hash SHA-256 devuelto por la consulta",
  "motivo": "Los clientes se retiraron sin pedir"
}
```

La revisión real debe ser una cadena hexadecimal de 64 caracteres. `motivo`
es opcional para ocupar/limpiar y tiene máximo 250 caracteres normalizados.
No se admiten estado, responsable, cuenta, aforo, capacidad, coordenadas ni
campos arbitrarios en estos comandos. No se admiten query params.
IDs de mesa: enteros positivos hasta 2147483647, sin ceros iniciales.

`pedido_abierto` expone únicamente ID como texto, código, estado de cuenta y
versión. No devuelve datos del cliente, costos ni credenciales. Su ID es BIGINT
y se conserva sin conversión a Number. La consulta no vence bloqueos ni cambia
estados. La lectura de mapa/detalle es coherente bajo REPEATABLE READ y no-store.

Éxito 200; sin sesión 401; sin permiso/CSRF 403; entrada inválida 400; mesa u
operación propia inexistente 404. Conflictos 409: `MESA_DESACTUALIZADA`,
`MESA_CON_CUENTA_ACTIVA`, `TRANSICION_MESA_NO_VALIDA`, `MESA_NO_DISPONIBLE`,
`MESA_NO_ASIGNADA`, `MESA_INCONSISTENTE` o conflictos de idempotencia.

## Consistencia y recuperación

Los comandos bloquean actor y mesa. Comparan revisión, validan transición y
guardan cambio, auditoría, evento durable y respuesta idempotente en la misma
transacción. El hash incluye campos de mesa, cuenta activa/versión y la última
marca de auditoría de esa mesa. Así una consulta antigua no vuelve a valer
después de un ciclo ocupar/liberar/limpiar aunque coincidan los campos visibles.
Esta garantía corresponde a los servicios; no pretende validar cambios SQL
externos que omitan auditoría.

Los eventos `mesa.*` van a sala `salon`; su `version` es 1 para el esquema del
payload y `cambio_id` identifica la auditoría. No hay publicación WebSocket en
esta fase. La revisión de la consulta es el control de estado del comando.

Una respuesta perdida se recupera con el mismo tipo y clave. Un 404 de consulta
no prueba que el POST haya terminado: resolver usa la barrera por actor para
esperar el commit o dejar una cancelación que impide ejecutar después esa clave.
Repetir el mismo cuerpo normalizado devuelve el resultado original; cambiarlo
con la misma identidad se rechaza. Después de recuperar se consulta de nuevo
la mesa antes de preparar otra acción.

Crear pedido bloquea mesa y comprueba que no exista cuenta activa. Además,
el índice SQL único sobre `mesa_activa_id`, calculado por MySQL, impide dos
cuentas abiertas/en pago para la misma mesa. Nunca se escribe esa columna.
La consulta de cuenta bajo el bloqueo de mesa no añade un bloqueo de pedido
en orden inverso al cobro. El flujo comercial existente reintenta deadlocks y
timeouts transitorios hasta dos veces, conservando la identidad de operación.

Al cobrar, el pedido queda pagado y la mesa por limpiar dentro de la misma
transacción que venta, pagos, puntos y trabajo de impresión. Si falla un paso,
se revierte todo. Limpiar no cancela pedidos ni toca reservas, Kardex o ventas.

`GET /api/pedidos/registro`, con `pedidos/crear`, ahora ofrece mesas libres y
mesas propias ocupadas sin cuenta. El POS las denomina **Mesa disponible**.
El servidor vuelve a comprobar disponibilidad al confirmar, aunque la lista
ya se haya consultado. La ocupación explícita exige `mesas/gestionar`; el
registro normal mantiene `pedidos/crear` y asigna al actor del pedido.

## Archivos y funciones

| Ruta bajo backend | Responsabilidad |
| --- | --- |
| `src/services/mesas-reglas.js` | Validar IDs/cuerpos, definir cuentas activas, calcular revisión y resolver transiciones puras. |
| `src/services/mesas.service.js` | `consultarMesaSalon`, `cambiarMesa`, `mesasDisponiblesPedido`, `tomarMesaParaPedido`, `comprobarMesaAmpliacion`, `finalizarMesaTrasCobro`. Bloqueos, asignación y cambios auditados. |
| `src/controllers/salon.controller.js` | Adaptar mapa/detalle/comandos y recuperar/resolver operaciones propias. |
| `src/routes/salon.routes.js` | Rutas protegidas, lectura y acciones explícitas. |
| `src/services/salon.service.js` | Mapa con cuentas mínimas y marcas de auditoría en consultas agrupadas, sin N+1 por mesa. |
| `src/services/pedidos.service.js`, `cobros.service.js` | Coordinar registro, ampliación y cobro con mesa y responsable. |
| `src/services/operacion-comercial.js`, `controllers/pedidos.controller.js` | Tipos recuperables, sala de outbox, disponibilidad del registro y errores legibles. |
| `tests/mesas-reglas.test.mjs`, `tests/mesas-integracion.mjs` | Reglas, HTTP/MySQL, concurrencia, idempotencia y rollback. |

También se actualizan regresión de salón, etiqueta del POS y su prueba de
navegador, README principal/frontend, SALON.md y PEDIDOS.md.

## Pruebas

Desde backend con MySQL local configurado:

```powershell
npm.cmd run test:mesas
npm.cmd run test:mesas:integracion
npm.cmd run test:salon:integracion
npm.cmd run test:pedidos:integracion
npm.cmd run test:caja:integracion
```

Se probaron CSRF/permisos, IDs/cuerpos inválidos, ciclos de mesa, revisión antigua
tras otro ciclo, responsables, cuenta activa y checkout vencido, índice único,
ampliación propia, recuperación/cancelación, ocupaciones simultáneas, limpieza
simultánea, ocupar frente a crear pedido y liberar frente a registrar pedido.
Fallos tardíos de outbox e impresión revierten cambios. El cobro se prueba con
política fiscal ficticia dentro de una transacción revertida; FINANZAS real no
se modifica. Las fixtures se retiran; no ejecutar integración en producción.

La base del local sigue sin distribución configurada. Esta fase no inventa ni
inserta mesas reales. PDF fuera de Git: `DOCUMENTACION/FASES/FASE_34.pdf`.
Siguiente: fase 35, modificadores y notas de preparación.
