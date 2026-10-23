# Fase 31 · Cierre Z, caja chica y devoluciones

Implementada el 23/10/2026 sobre las tablas existentes. No cambia FINANZAS,
no requiere migraciones y no incorpora pantallas: el arqueo visual corresponde
a fase 32. No modifica cierres, ventas, productos o cajas reales durante pruebas.

## Caja y corte

Teórico efectivo = **apertura + efectivo aplicado + ingresos - egresos -
devoluciones en efectivo desembolsadas por la sesión**.

Los pagos se obtienen de `ventas_pagos_split` unidos a `ventas_comprobantes`
por venta y filtrados por `sesion_caja_id`. El recibido del cliente no es otro
ingreso y el vuelto no se descuenta nuevamente del aplicado. Yape, Plin,
tarjetas y transferencias concilian por separado, sin inflar el efectivo.
Puntos VIP son un medio no monetario y no se convierten en efectivo.

Ejemplo: apertura S/100 + efectivo aplicado S/60 + ingreso S/20 - egreso S/15
- devolución efectivo S/6 = **teórico S/159**. Un billete recibido de S/100 con
vuelto S/40 sigue aportando solo S/60. Contado S/158 produce descuadre **-S/1**.

La sesión debe pertenecer al usuario autenticado. Un ingreso exige motivo e
importe positivo. Un egreso requiere además aprobación de uso único
`caja/egreso` sobre esa sesión y efectivo teórico suficiente. El servidor
obtiene `autorizado_por`; el cliente no lo elige.

Consultar resumen no cierra. Devuelve `resumen`, `estado` y `revision` SHA-256.
Cerrar exige conteo real y esa revisión. Bajo bloqueo de la sesión se vuelve a
consolidar: si entró otra operación devuelve `CAJA_DESACTUALIZADA` y se debe
revisar/contar de nuevo. La referencia es el turno, no la fecha del calendario;
una venta a las 00:03 sigue perteneciendo a su sesión abierta.

El cierre guarda `cierre_fecha`, `cierre_teorico_efectivo`,
`cierre_real_efectivo`, `descuadre_monto`, estado `cerrada` y un **objeto JSON**
en `snapshot_memento_json`, sin doble serialización. Incluye versión de fórmula,
moneda, zona horaria, corte UTC, ventas, pagos, movimientos, devoluciones,
totales, conteo y observaciones. No conserva referencias bancarias ni datos
personales de clientes en el corte.

Una consulta posterior devuelve ese snapshot, sin recalcular el pasado. No hay
endpoint de edición, reapertura ni eliminación del cierre. Otra clave no puede
cerrarlo otra vez. Correcciones o reimpresión deben incorporar un expediente
o copia separada en su etapa; esta fase no los simula. Esta inmutabilidad se
exige en los servicios, no es una propiedad automática de JSON ni limita por
sí sola a un administrador que ejecute SQL fuera de la aplicación.

## Devoluciones y puntos

1. Consultar la venta y seleccionar IDs de detalle y cantidades enteras. Solo
   tickets internos emitidos con snapshots completos. La integración de notas
   de crédito fiscales tiene sus requisitos propios y no se reemplaza aquí.
2. Previsualizar: el servidor calcula importe, reparto por medio, compensación
   de puntos y revisión; no escribe ni consume autorizaciones.
3. Obtener autorización vigente `ventas/devolver` sobre la venta, limitada al
   actor. El aprobador necesita `seguridad/gestionar` y `ventas/devolver`;
   el actor conserva sus permisos, no los obtiene al aprobarse.
4. Confirmar con sesión propia abierta, revisión, autorización y motivo.
   Cada desembolso digital exige referencia y `verificado: true`. Esta es una
   verificación operativa: el servidor registra el reembolso ya comprobado;
   no ejecuta transferencias ni integra una pasarela.

La transacción bloquea la sesión y la venta. Las cantidades acumuladas no
superan lo vendido; cabecera, detalle y desembolsos concilian con lo cobrado.
El importe procede del snapshot, no del catálogo actual ni de importes del
cliente. El redondeo acumulado por línea conserva todos los céntimos: una línea
S/1 entre tres unidades puede devolverse S/0.33, S/0.34 y S/0.33.

Se restituyen puntos canjeados proporcionalmente al importe acumulado devuelto,
en puntos enteros y con el valor congelado original. El resto monetario se reparte
proporcionalmente entre las capacidades restantes de los medios originales, con
restos mayores y desempate por orden original. Nunca se devuelve más de lo
aplicado por medio ni se paga en efectivo un canje. Un parcial incompatible con
el valor indivisible de los puntos se rechaza sin efectos; debe revisarse la
selección o solicitarse la devolución completa.

Los puntos ganados se atribuyen por línea según el modo congelado (`por_sol`
o `por_producto`), y se revierten proporcionalmente a sus cantidades acumuladas.
Los contramovimientos mantienen venta y UID de la devolución, sin borrar
historial. Se ajustan saldo actual e histórico de ganancias; el canje restaurado
no se registra como ganancia nueva. Las reglas de FINANZAS actuales no cambian
una devolución histórica.

**Saldo insuficiente:** la operación normal se rechaza y se revierte incluso
el consumo de la aprobación. Para registrar deuda de puntos se exige una
segunda autorización específica, `ventas/devolver_sin_saldo`, sobre la misma
venta, enviada como `autorizacion_saldo_id`. Queda auditada; un saldo negativo
no puede canjearse. Compras posteriores sin canje pueden amortizarlo con sus
ganancias, sin crear una deuda nueva. No se perdonan puntos ni se convierten
en efectivo para resolver la diferencia.

Cabecera, detalles, desembolsos, puntos, autorización, auditoría, outbox e
idempotencia se confirman juntos. La venta y su pedido siguen conservados.
`restituye_stock` siempre es `false`; no se modifican reservas, tareas de cocina
ni Kardex. La devolución económica no es evidencia de reposición de insumos.

Una venta de una sesión cerrada puede devolverse desde una nueva sesión
abierta: el desembolso afecta a esa nueva sesión y no sobrescribe el corte
original. Los netos digitales de una sesión pueden ser negativos por ese motivo.

## Contratos HTTP bajo /api

Todas las rutas exigen sesión. Escrituras: cookie HttpOnly, origen permitido y
`X-CSRF-Protection: 1`. Las mutaciones financieras exigen `Idempotency-Key`
de 8–64 caracteres `[a-zA-Z0-9_-]`. Los IDs BIGINT de ventas, detalles y
autorizaciones se envían como cadenas exactas.

| Ruta | Permiso y finalidad |
|---|---|
| `GET /caja/sesiones/:id/resumen` | `caja/gestionar`; resumen abierto o cierre congelado propio. |
| `POST /caja/sesiones/:id/movimientos` | `caja/gestionar`; ingreso/egreso. |
| `POST /caja/sesiones/:id/cierre` | `caja/gestionar`; conteo y cierre propio. |
| `GET /ventas/:id/devoluciones` | `ventas/devolver`; líneas originales, cantidades devueltas e historial. |
| `POST /ventas/:id/devoluciones/previsualizar` | `ventas/devolver`; propuesta sin escritura; no necesita clave. |
| `POST /ventas/:id/devoluciones` | `ventas/devolver` + `caja/gestionar`; devolución autorizada. |
| `GET /caja/operaciones/:tipo/:clave` | Recuperar operación propia de caja. |
| `POST /caja/operaciones/:tipo/:clave/resolver` | Resolver un intento desconocido de caja, cuerpo `{}`. |
| `GET /ventas/operaciones/venta.devolver/:clave` | Recuperar devolución propia. |
| `POST /ventas/operaciones/venta.devolver/:clave/resolver` | Resolver devolución desconocida, cuerpo `{}`. |

Se conservan las rutas de apertura y recuperación de fase 30. Tipos de operación:
`caja.abrir`, `caja.movimiento`, `caja.cerrar`, `venta.devolver`. Un reintento con
misma clave/cuerpo recupera el resultado; un cuerpo distinto da 409. Un 404 de
recuperación no demuestra fracaso: resolver usa la barrera del actor para
recuperar el commit o cancelar definitivamente esa identidad. La futura interfaz
debe guardar la identidad antes del POST y no generar otra por una respuesta perdida.

Ejemplos de cuerpos, sin credenciales:

```json
{"tipo":"ingreso","monto":"20.00","concepto":"Fondo para cambio"}
```
```json
{"tipo":"egreso","monto":"15.00","concepto":"Gasto operativo","comprobante_respaldo":"DOC-1","autorizacion_id":"ID_APROBACION"}
```
```json
{"cierre_real_efectivo":"158.00","revision":"HASH_DEVUELTO_POR_RESUMEN","observaciones":"Conteo revisado"}
```

Previsualizar devolución:

```json
{"lineas":[{"venta_detalle_id":"123","cantidad":1}]}
```

Confirmar usando la propuesta del servidor; `sesion_id` es INT:

```json
{"sesion_id":7,"lineas":[{"venta_detalle_id":"123","cantidad":1}],"motivo":"Producto incorrecto","autorizacion_id":"ID_APROBACION","revision":"HASH_PROPUESTA","referencias":[{"metodo_pago":"yape","referencia":"REEMBOLSO-VERIFICADO","verificado":true}]}
```

Solo incluir referencias para medios digitales con importe en la propuesta.
No se aceptan total, precio, impuesto, autorizador ni reposición de stock en el
comando. Se rechazan campos desconocidos y parámetros de consulta adicionales.

## Archivos, pruebas y siguiente fase

| Archivo nuevo | Funciones principales |
|---|---|
| `src/services/caja-calculo.js` | Consolidar por medio, dinero con signo, revisión, reparto, cantidades e importes y compensación de puntos. |
| `src/services/caja-cierre.service.js` | Bloquear sesión propia, consultar resumen, registrar movimiento y cerrar con snapshot. |
| `src/services/devoluciones.service.js` | Consultar historial, previsualizar y confirmar devolución atómica. |
| `src/controllers/caja-cierre.controller.js` | Validación HTTP, contexto de sesión y recuperación propia. |
| `src/routes/devoluciones.routes.js` | Rutas protegidas de ventas/devoluciones. |
| `tests/caja-calculo.test.mjs` | Seis pruebas puras de dinero, parciales, medios, puntos e IDs exactos. |
| `tests/caja-integracion.mjs` | HTTP/MySQL local con fixtures, autorización, rollback, concurrencia y limpieza. |

Se actualizan app, rutas de caja, errores comerciales, políticas/validación de
autorizaciones, idempotencia, cobro y su prueba de integración, package.json y
README. Se reutilizan permisos existentes; no se amplía el rol cajero para
devolver sin una asignación expresa de `ventas/devolver`.

Desde `CODIGO/backend`:

```powershell
npm.cmd run test:caja
npm.cmd run test:caja:integracion
npm.cmd run test:pedidos:integracion
npm.cmd run test:compras:integracion
```

Pasaron 32 pruebas unitarias backend y los tres escenarios de integración,
además de lint y build frontend. Se comprobaron rechazo de sesión ajena/cerrada,
CSRF/permisos, revisión obsoleta, clave repetida, autorizado vencido, fondos
insuficientes, rollback después de actualizar cierre/puntos, devolución parcial,
canje, deuda autorizada, amortización sin canje y snapshots conservados. Dos
cajeros compiten por la última cantidad sin doble devolución; corte contra
movimiento o devolución incorpora el efecto previo o rechaza el posterior.

Las fixtures históricas contienen política de prueba únicamente en sus propias
ventas; no se cambia FINANZAS real. La regresión de cobro usa su política
ficticia dentro de una transacción revertida. No ejecutar estas pruebas contra
producción. No se transfieren fondos ni se emiten documentos fiscales reales.

Siguiente: fase 32, interfaz responsive de arqueo, consulta y confirmación del
conteo sobre estos contratos. Resumen PDF: `DOCUMENTACION/FASES/FASE_31.pdf`,
fuera del repositorio CODIGO.
