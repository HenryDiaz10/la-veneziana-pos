# Inventario transaccional - fase 23

Servicios internos sobre `insumos_almacen`, `reservas_insumos` e
`inventario_kardex`. No añade tablas, dependencias, rutas HTTP ni pantallas.
El monitor y sus consultas públicas corresponden a la fase 24. Pedidos, KDS
y compras conectarán estas primitivas desde sus propios flujos posteriores.

## Saldos y cálculo

La fuente oficial es el insumo: disponible = físico - reservado.
`productos_venta.stock_actual` no participa en estos servicios. Los productos
directos deberán congelar su insumo vinculado en una tarea de despacho; no
descontar además un saldo de producto. Los combos se descomponen en tareas.

Cantidades y costos se reciben en la unidad base del insumo, con hasta cuatro
decimales. Se rechazan negativos, notación científica, comas y valores fuera de
DECIMAL(12,4). El cálculo usa BigInt; se redondea el promedio y el costo total
a cuatro decimales, mitad alejándose de cero. No se aplica otra vez la merma.

El promedio ponderado móvil de un ingreso es:

`(físico_anterior × promedio_anterior + cantidad × costo_ingresado) / físico_nuevo`

Con físico cero, toma el costo ingresado. Cada ingreso actualiza `ultimo_costo`.
Las salidas mantienen promedio/último costo y congelan el costo vigente en
Kardex. Las reservas consumidas guardan además costo unitario y total histórico
en sus columnas snapshot. Un costo total fuera de DECIMAL(14,4) revierte todo.

## Servicios y contratos

Importar desde `src/services/inventario.service.js`. Los errores lanzan
`ErrorInventario` con `codigo` y, cuando corresponde, `detalle`. Un error nunca
se convierte silenciosamente en éxito dentro de una transacción externa.

### reservarTareas(tareaIds, { transaction } = {})

Recibe entre 1 y 100 IDs de tarea distintos; BIGINT como texto canónico.
Lee **únicamente snapshots ya persistidos por el servidor**. Formato de receta
versión 1 de la fase 21: identidad de producto/variante, cantidad de la tarea
e ingredientes con ID, unidad base, cantidad bruta unitaria y total. Verifica
que unitaria × cantidad sea igual al total, sin multiplicarlo de nuevo.

Bloquea todas las tareas por ID y luego todos los insumos por ID ascendente.
Valida la disponibilidad **agregada** del lote antes de escribir. Las reservas
nuevas requieren tarea en espera no iniciada, insumo activo sin quiebre y la
misma unidad del snapshot. Incrementa reservado y crea una fila por tarea/insumo;
físico y Kardex no cambian. Si falta algo, revierte todo el lote con
`STOCK_INSUFICIENTE` y cantidades requeridas/disponibles por insumo.

La identidad de reserva es tarea/insumo (índice único existente). Repetir un
conjunto reservado o consumido compatible devuelve `repetida: true` sin
reservar otra vez. Una reserva liberada no puede resucitar: una nueva producción
requiere una tarea nueva. Cambiar el snapshot después de reservar provoca
`RESERVA_INCONSISTENTE`.

### consumirTarea(tareaId, { usuarioId, transaction } = {})

Requiere reservas completas activas y tarea en espera/preparando. Disminuye
físico y reservado, crea una `SALIDA_VENTA` por insumo y marca cada reserva
consumida con su costo y `kardex_id`, todo en la misma transacción.

Identidad determinista: `tarea:<id>:insumo:<id>`, exclusiva del consumo de tareas.
Repetir una preparación ya consumida devuelve las reservas históricas con
`repetida: true`; no crea otra salida ni recalcula su costo. El usuario se obtiene
de la sesión en el futuro orquestador, nunca de un cuerpo HTTP libre.

El consumo se llama al iniciar preparación o despachar un producto directo.
**El cobro no descuenta insumos.** Desactivar un insumo después de reservar no
cancela silenciosamente el compromiso existente.

### liberarTarea(tareaId, { transaction } = {})

Solo libera reservas no consumidas de una tarea en espera/cancelada, sin fecha
de inicio. Disminuye reservado y marca `liberada`; no aumenta físico ni genera
Kardex. Repetir devuelve `repetida: true`. No devuelve stock de una tarea ya
consumida. La cancelación posterior al inicio, la clasificación de descarte y
su autorización gerencial corresponden al flujo de cancelación: no crear una
segunda salida física por ingredientes que ya fueron consumidos.

### registrarMovimiento(datos, { transaction } = {})

Primitiva para documentos de compra, merma y ajuste autorizados. Campos:

| Campo | Regla |
| --- | --- |
| insumo_id / usuario_id | IDs enteros positivos; actor confirmado por el servidor. |
| tipo_transaccion | INGRESO_COMPRA, INGRESO_AJUSTE, SALIDA_VENTA, SALIDA_MERMA o SALIDA_AJUSTE. |
| cantidad | Magnitud positiva en unidad base; el tipo define la dirección. |
| costo_unitario | Obligatorio en ingresos, incluso cero; no se admite en salidas. |
| operacion_uid | Identidad estable `mov:` seguida de ASCII minúsculo, números, `:`, `_` o `-`; máximo 64 caracteres. |
| referencia_documento / notas | Opcionales, hasta 100/255 caracteres, sin controles. |

Suma/resta físico y registra `saldo_posterior`, costo y actor atómicamente.
Una salida general solo puede tomar **disponible**, sin invadir reservas.
El UID es global: repetir el mismo contenido devuelve el movimiento anterior
y el saldo actual; reutilizarlo con otro insumo, cantidad, tipo, costo de ingreso,
actor o referencia/notas provoca `OPERACION_EN_CONFLICTO`. No cambiar el UID
al reintentar una operación cuya respuesta se perdió.

## Integración obligatoria con los módulos de negocio

Estos servicios no sustituyen autenticación, permisos ni autorizaciones
sensibles. **No exponer registrarMovimiento como un CRUD genérico de saldos.**
El futuro controlador debe validar el documento, motivo y permiso. Un ajuste
debe consumir la autorización `inventario/ajustar` existente con el actor y
el insumo correcto, dentro de la misma transacción; todavía no hay un endpoint
de ajustes que omita esa autorización.

El orquestador de confirmación debe crear pedido/ítems/tareas con snapshots
del servidor y llamar **una vez** a reservarTareas con todos los componentes
en esa misma transacción. No confirmar cada componente por separado. El de
KDS/cancelación debe coordinar consumo/liberación con estado, versión, actor,
motivo, historial y outbox, también en la misma transacción. Una compra debe
coordinar cabecera/detalles/estado con sus ingresos; un borrador no mueve stock.

```js
await sequelize.transaction(async transaction => {
  // Autenticar/autorizar y validar la transición de negocio previamente.
  // Bloquear su pedido/documento antes de bloquear tareas e insumos.
  await consumirTarea(tareaId, { usuarioId: actor.id, transaction });
  // Guardar transición KDS, historial y evento outbox con transaction.
});
```

Dejar propagar el error hasta salir de la transacción y traducirlo después a
HTTP. No capturarlo dentro del callback para confirmar otras escrituras.
El servicio no cambia estados KDS ni envía eventos por su cuenta. Esto permite
que el movimiento y su operación de negocio se confirmen o reviertan juntos.

Sin transaction, cada llamada abre una transacción READ COMMITTED propia;
reintenta como máximo dos veces adicionales ante deadlock. Con una transacción
externa, el orquestador es responsable de reintentar **su operación completa**.
Se usan lecturas con bloqueo para evitar estados obsoletos tras esperar.

Errores principales: `DATOS_INVALIDOS`, `SNAPSHOT_INVALIDO`, `TAREA_INEXISTENTE`,
`TAREA_NO_RESERVABLE`, `TAREA_NO_CONSUMIBLE`, `TAREA_YA_INICIADA`,
`RESERVA_FINALIZADA`, `RESERVA_INCONSISTENTE`, `INSUMO_NO_DISPONIBLE`,
`UNIDAD_CAMBIADA`, `STOCK_INSUFICIENTE`, `SALDOS_INCONSISTENTES`,
`CANTIDAD_FUERA_RANGO`, `COSTO_FUERA_RANGO` y `OPERACION_EN_CONFLICTO`.

## Archivos y verificación

- `src/services/inventario-calculo.js`: decimales, rangos, promedio, costos,
  validación de snapshots e identidad de tareas.
- `src/services/inventario.service.js`: bloqueos, transacciones y operaciones.
- `tests/inventario-calculo.test.js`: cuatro pruebas sin base de datos.
- `tests/inventario-integracion.js`: pruebas MySQL explícitas con fixtures
  propios, limpieza por ID y rechazo de producción/servidor no local.

Desde backend:

```powershell
npm.cmd run test:inventario
npm.cmd run test:inventario:integracion
```

Comprobado en MySQL: dos tareas por la última porción (solo una reserva),
consumos e ingresos concurrentes repetidos sin duplicados, cancelación sin
ingreso físico, lote insuficiente sin reservas parciales, promedio ponderado,
cinco tipos de movimiento y protección del stock comprometido. Fallos simulados
entre saldo y Kardex, incluido el segundo ingrediente, revirtieron saldos,
reservas y todos los movimientos previos del lote. Un error del orquestador
también revirtió el consumo. Se usó un snapshot real del resolver de recetas
para dos platos, sin volver a aplicar merma y sin consultar cambios posteriores
del maestro. Los datos temporales se retiraron al finalizar.
