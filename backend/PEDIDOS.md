# Fase 28: pedidos, caja mínima y cobro separado

**Fase 31:** cierre Z, movimientos, devoluciones y compensación de puntos
disponibles en backend. Ver [CAJA.md](CAJA.md). Cobrar exige todavía sesión
abierta; una deuda de puntos autorizada puede amortizarse con nuevas ganancias
sin permitir canje. La pantalla de arqueo se incorpora en fase 32.

**Actualización fase 30:** el POS y Pagos ya registran pedidos y confirman cobros.
El cobro encola ticket y outbox en la misma transacción. Se añaden resolución
segura de intentos desconocidos, consulta de mesas y agente autenticado de
impresión en simulación. Contratos y pruebas: [VENTA_FINAL.md](../VENTA_FINAL.md).

Implementada el 23/10/2026. Backend sobre las tablas existentes; no requiere
migraciones ni crea tablas genéricas de ventas. El POS sigue mostrando su
borrador: la interfaz de pagos corresponde a la fase 29 y su conexión final a la 30.

## Operaciones y permisos

Todas las escrituras requieren cookie de sesión, origen válido,
`X-CSRF-Protection: 1` e `Idempotency-Key` de 8 a 64 caracteres alfanuméricos,
guion o guion bajo. Usar una clave nueva por operación lógica; conservarla ante
una respuesta perdida. Repetir exactamente el cuerpo recupera la respuesta;
reutilizar la clave con otro cuerpo produce 409. El ámbito incluye usuario y tipo.

| Método y ruta bajo /api | Permiso | Función |
|---|---|---|
| POST /pedidos | pedidos/crear | Crear cabecera, líneas, modificadores, tareas y reservas atómicamente. |
| GET /pedidos/:id | pedidos/crear o ventas/cobrar | Consultar estado, versión y selecciones comerciales sin recetas ni costos. |
| POST /pedidos/:id/lineas | pedidos/crear | Ampliar una cuenta abierta con versión esperada. |
| POST /pedidos/:id/bloqueo-pago | ventas/cobrar | Bloquear checkout a nombre del cajero durante cinco minutos. |
| POST /pedidos/:id/liberar-pago | ventas/cobrar | Liberar únicamente el bloqueo propio, validando versión. |
| POST /pedidos/:id/cobro | ventas/cobrar | Cobrar un pedido ya existente; nunca recrea sus ítems. |
| GET /pedidos/:id/contexto-pago | ventas/cobrar | Consulta de fase 29: total oficial, versión/bloqueo, sesión propia y disponibilidad de canje, sin escrituras. |
| GET /pedidos/operaciones/:tipo/:clave | Según operación | Recuperar solo una operación propia confirmada. |
| GET /caja/sesion | caja/gestionar | Consultar sesión propia abierta y cajas habilitadas, sin IP del terminal. |
| POST /caja/sesiones | caja/gestionar | Abrir una sesión, sin registrar venta. |
| GET /caja/operaciones/:clave | caja/gestionar | Recuperar una apertura propia. |

Los IDs BIGINT se devuelven como cadenas para evitar pérdida de precisión.
Los tipos recuperables son `pedido.crear`, `pedido.ampliar`,
`pedido.bloquear_pago`, `pedido.liberar_pago`, `pedido.cobrar` y `caja.abrir`.

## Contratos de entrada

Crear:

```json
{
  "tipo_atencion": "llevar",
  "cliente_id": null,
  "notas_globales": "Recoger en mostrador",
  "lineas": [{"productoId": 7, "varianteId": null, "modificadoresIds": [11],
    "cantidad": 1, "indicaciones": "Sin cebolla"}]
}
```

El identificador de la opción de presa debe venir de la configuración real.
No aceptar precios, totales, costos, actor ni receta enviados por el navegador.
Cantidad: entero 1-10000. Máximo 100 líneas activas por pedido y 50 opciones por
línea. Indicaciones: 250 caracteres; notas globales: 500. No se fusionan líneas.

`salon` requiere `mesa_id` libre o ya ocupada por el mismo actor sin cuenta activa,
y no admite dirección. El registro asigna responsable; la ampliación de un
pedido de salón exige al responsable asignado. Ver [MESAS.md](MESAS.md).
`llevar` no admite mesa ni
dirección; `delivery` requiere cliente activo y dirección que le pertenezca.
El snapshot conserva nombre/contacto y dirección usados. En esta entrega los
totales corresponden a productos: las tarifas de reparto de CARTA siguen siendo
referencia, sin cobro automático. No enviar cargos libres de delivery ni descuentos.

Ampliar: `{ "version": 1, "lineas": [...] }`. Checkout y liberación:
`{ "version": 2 }`. Cada cambio de cuenta incrementa su versión.

Apertura: `{ "caja_fisica_id": 1, "apertura_monto_base": "50.00" }`.
Una sola sesión abierta por caja y cajero; también lo garantizan los índices SQL.

Cobro de ejemplo, exclusivamente con datos y referencias reales en operación:

```json
{
  "version": 3,
  "sesion_caja_id": 1,
  "pagos": [
    {"metodo_pago":"yape", "monto_pagado":"4.00",
      "referencia_operacion":"REFERENCIA_REAL", "verificado":true},
    {"metodo_pago":"efectivo", "monto_pagado":"6.00", "monto_entregado":"10.00"}
  ]
}
```

Aplicado S/10, efectivo entregado S/10 y vuelto S/4. El monto entregado no se suma
como ingreso adicional. Máximo diez pagos y una entrada de efectivo por cobro.
Los métodos digitales necesitan referencia y verificación operativa; el sistema
no verifica Yape/Plin contra una pasarela. No almacenar datos sensibles de tarjetas.

## Transacciones y responsabilidades

`pedidos.service.js` vuelve a validar producto/categoría activos, variante propia,
opciones asignadas y reglas de selección. Calcula precios en céntimos BigInt y
guarda snapshots. Resuelve recetas existentes sin crearlas durante una venta.
Una receta faltante o stock insuficiente revierte TODO el pedido y la idempotencia.
Los combos quedan rechazados explícitamente hasta integrar su descomposición.

Los platos usan `resolverReceta`; los productos directos requieren insumo propio
en unidades y control de stock. Se generan tareas de cocina o despacho con su
snapshot de insumos. `reservarTareas` corre en la misma transacción. El físico se
descuenta con `consumirTarea` al iniciar preparación/despachar, no al cobrar.

Los eventos `pedido.confirmado`, `pedido.cocina` y `venta.confirmada` se guardan
en outbox junto al negocio. Los de cocina apuntan a la sala `kds`; no se publica
ningún mensaje antes del commit. Worker/WebSockets y pantalla KDS corresponden
a fases posteriores: en esta fase queda el registro durable, no una cocina en vivo.

Un checkout activo impide ampliar la cuenta. Solo el propietario puede liberar o
cobrar; el cobro revalida el vencimiento. La consulta limpia un bloqueo vencido e
incrementa versión. Un 409 requiere volver a consultar, conservando el borrador.

`cobros.service.js` bloquea sesión de caja y pedido, exige propiedad de ambos,
verifica total oficial y crea una única venta por pedido, sus pagos y detalles
comerciales. Cambia a pagada y deja la mesa pendiente de limpieza. No cambia
ítems de cocina ni toca stock. Los índices únicos y la idempotencia impiden duplicados.

`operacion-comercial.js` centraliza transacciones, huella canónica, recuperación,
auditoría y eventos. Reintenta transacciones completas ante deadlock/timeout de
bloqueo. Las pruebas pueden usar una transacción padre y savepoints; HTTP nunca
acepta una transacción ni permisos desde el cuerpo.

## Política fiscal y puntos

`FINANZAS` debe definir `igv_porcentaje` (0-100, hasta dos decimales) y
`precios_incluyen_impuesto: true`. No hay tasa supuesta. La configuración inicial
pendiente impide cobrar, pero no registrar pedidos. La tasa usada se congela en
la venta y sus detalles; base y tributo se redondean por línea y luego se suman.
La tasa 18 usada por las pruebas es ficticia y nunca se confirma en FINANZAS real.

Solo se emite **ticket interno**, sin declaración de emisión fiscal aceptada,
serie fiscal, XML o hash SUNAT. No se admiten descuentos ni cortesías sin su flujo
de autorización; esos valores no pueden introducirse como diferencias de caja.

Acumulación exclusiva: `puntos_vip_modo` es `por_sol` (predeterminado) o
`por_producto`. `puntos_vip_por_sol` es un entero 0-10000 (predeterminado 1).
Se trunca a entero y no se acumula por dos reglas simultáneas. El canje requiere
cliente, permiso `clientes/gestionar` y `valor_punto_pen` explícito positivo;
un pago `puntos_vip` indica `puntos` e importe exacto. No hay equivalencia supuesta.
El importe canjeado no gana puntos; en modo producto se prorratean los puntos
según el importe elegible. El canje es medio de pago y no otro descuento adicional.
Saldo, historial, movimientos con identidad y snapshot de regla se actualizan
dentro de la venta, con bloqueo del cliente y comprobación de límites.

## Archivos y pruebas

- Servicios: `pedidos-calculo.js`, `operacion-comercial.js`, `pedidos.service.js`,
  `caja.service.js`, `cobros.service.js`.
- HTTP: `controllers/pedidos.controller.js`, `routes/pedidos.routes.js`,
  `routes/caja.routes.js`; registro en `src/app.js`.
- `npm.cmd run test:pedidos`: validación, notas, precisión, tasa pendiente,
  pagos mixtos, recibido/vuelto y equivalencia de puntos.
- `npm.cmd run test:pedidos:integracion`: MySQL local, fixtures temporales y HTTP.
  Verifica permisos/CSRF, reserva y rollback, presa y notas, reintentos concurrentes,
  recuperación propia, versión, checkout, apertura única, venta única, puntos y
  rollback ante fallo tardío. Dos actores compiten por el disponible sin sobreventa.
  El cobro conserva saldos; consumir una tarea aparte genera una sola salida.

Las pruebas de cobro cambian FINANZAS solo dentro de una transacción revertida.
No modifican productos de la carta ni sesiones de caja de empleados reales.
No ejecutar este escenario en producción. Al finalizar se retiran sus registros.
