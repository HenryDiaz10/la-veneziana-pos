# Fase 39 - Consultas gerenciales y clasificación de gastos

> Rutas y comandos: salvo indicación expresa, las rutas de código y los comandos de esta guía son relativos a `backend/`, no a la carpeta del documento.

Backend para la interfaz de fase 40. Reutiliza tablas, permisos y aritmética
exacta existentes. Sin nuevas dependencias, migraciones ni cambios a FINANZAS.
No se registra una tasa supuesta ni se infiere deducibilidad de un gasto.

## Rutas y acceso

Todas las rutas bajo `/api/reportes` exigen sesión y `Cache-Control: no-store`.

| Método/ruta | Permiso | Finalidad |
| --- | --- | --- |
| `GET /gerencial` | reportes/leer | Resumen consistente y serie diaria de ventas. |
| `GET /gastos` | reportes/leer | Listado paginado por ID. |
| `GET /gastos/categorias` | reportes/leer | Categorías y metadato de deducibilidad registrado. |
| `POST /gastos` | configuracion/gestionar | Registrar gasto, sin realizar un pago. |
| `POST /gastos/categorias` | configuracion/gestionar | Registrar categoría sin duplicar nombre. |

Lectura no otorga escritura. Se reutiliza el permiso administrativo existente;
no se da gestión de gastos a cajeros ni se alteran roles automáticamente.
POST requiere Origin/CSRF y `Idempotency-Key` (8-64 caracteres alfanuméricos,
guion o subrayado). Reenviar clave/cuerpo idénticos recupera el resultado original,
también ante respuesta perdida. Cambiar cuerpo con la misma clave produce 409.
No se añaden edición/eliminación de gastos históricos en esta fase.

## Filtros y precisión

`desde` y `hasta`: fechas ISO civiles obligatorias (2000-2099), inclusivas,
periodo de hasta 366 días. Se valida el calendario real. Ejemplo de consulta:

```text
GET /api/reportes/gerencial?desde=2026-11-01&hasta=2026-11-06&estado=emitida
```

Opcionales: `sesion_id` entero positivo, `estado` = emitida (predeterminado),
anulada, rechazada_sunat o todos; `moneda=PEN`; `zona_horaria=America/Lima`
(predeterminada) o UTC. No se hace conversión cambiaria. Otro valor, arrays,
campos desconocidos, fechas inexistentes o un rango invertido producen 400.

El día Lima se convierte explícitamente a `[05:00 UTC, 05:00 UTC del día
siguiente)`, independiente de la zona del equipo y sin depender de tablas de
zonas de MySQL. Los filtros normalizados, UTC de inicio/fin, moneda, zona,
política aplicada y fecha de consulta se devuelven para poder revisar el alcance.

Importes comerciales se devuelven como texto a dos decimales; costos/márgenes a
cuatro. Agregaciones SQL DECIMAL y BigInt, sin sumar dinero con Number ni limitar
el total agregado a la capacidad de una sola venta. Conteos son números.

## Qué mide cada bloque

El resumen se consulta dentro de REPEATABLE READ: todas sus lecturas comparten
el mismo corte de datos confirmados, sin bloquear ventas para producir un reporte.
Los parámetros SQL están sustituidos de forma segura; no se interpolan filtros
como identificadores ni expresiones SQL elegidas por el navegador.

- `ventas`: cabeceras por fecha_emision, estado y sesión de cobro. Total incluye
  impuesto; base e impuesto son importes ya registrados, no tasas recalculadas.
  Cantidad y ticket promedio provienen de cabeceras sin unirse a pagos/detalles.
- `medios`: pagos aplicados a esas ventas, agrupados por método; no sumar efectivo
  recibido ni vuelto como ingreso extra. Incluye puntos/cortesía separados.
- `serie_ventas`: fecha civil, cantidad y total; solo días con registros, en orden.
- `devoluciones_periodo`: desembolsos de devolucion_pagos, por fecha de la
  devolución y sesión que paga, con estado de la venta original. Incluye una
  devolución de venta antigua, sin exigir que la venta esté en el mismo periodo.
  La cabecera no se multiplica por los métodos de devolución.
- `neto_comercial_periodo_incluye_impuesto`: ventas seleccionadas menos estos
  desembolsos. Puede ser negativo; no se etiqueta como utilidad contable.
- `gastos`: fecha_gasto civil, clasificaciones y total. Si se filtra sesión,
  entran solo gastos vinculados a su movimiento; se informa además el importe
  global sin asignación del periodo y se advierte que no está repartido.
- `movimientos`: ingresos/egresos por fecha_hora y sesión. Los egresos sin gasto
  vinculado se muestran aparte; no se convierten automáticamente en gastos.
- `costos.cohorte_ventas`: sumar costo_total_snapshot de reservas consumidas de
  las tareas de las ventas seleccionadas, a fecha de consulta. No leer recetas
  actuales ni costo_promedio actual. Una venta cobrada antes de preparar puede
  tener costo pendiente: no significa costo cero definitivo.
- `costos.salidas_periodo`: salidas de Kardex por fecha física, con costo histórico
  `ROUND(cantidad * costo_unitario_transaccion, 4)`, separadas por venta/merma/
  ajuste. Sin filtro de sesión incluyen salidas no cobradas y no se filtran por
  estado de venta. Con sesión, solo salidas vinculables a tareas de sus ventas
  y al estado seleccionado; ajustes no asignables no se imputan a esa sesión.

### Estimación y calidad

`estimacion` expone base registrada de la cohorte menos su costo conocido y,
después, gastos del periodo. Es una estimación interna actualizable, **no flujo
de caja ni cierre contable/tributario**. El costo de esa cohorte puede consumirse
en otra fecha; las salidas físicas del periodo se presentan aparte.

Se devuelve `null` en los márgenes y advertencias si existen reservas pendientes,
consumos sin costo/Kardex, líneas sin tarea, tareas sin reserva, tareas canceladas,
ventas sin líneas, pagos que no concilian, estados no emitidos seleccionados o
gastos globales no asignados cuando se filtra sesión.

Si cualquier venta de la cohorte tiene una devolución, también se omite la
estimación: el contrato actual de devoluciones guarda importe total, sin desglose
tributario específico. No inventar su impuesto/base ni restituir costos de stock
que no se devolvió. Se siguen mostrando ventas, desembolsos y costos por separado.
Una devolución de venta antigua aparece en el bloque de desembolsos; no se resta
de nuevo como gasto de la cohorte actual. Los resultados no sustituyen un estado
de resultados por devengo con ajustes y asignaciones contables validados.

## Registrar y clasificar gastos

`POST /gastos`: `categoria_id`, `descripcion` (3-255 caracteres), `monto_gasto`
(texto positivo con hasta dos decimales), `fecha_gasto`, `clasificacion` y,
opcionalmente, `movimiento_caja_id` y `comprobante_fiscal` (hasta 50 caracteres).
Clasificaciones: operativo, financiero, extraordinario, provision_impuesto.
La sesión aporta usuario_registro_id; no se admite desde el cliente.

Un gasto sin movimiento puede ser devengado, pagado fuera de caja o aún sin
vincular: registrarlo no crea un desembolso. La fecha del gasto puede diferir de
la del pago; cada bloque conserva su criterio temporal.

Un movimiento vinculado debe existir, ser egreso autorizado, tener exactamente
el mismo importe y no estar vinculado a otro gasto. Bloquear sesión antes que
movimiento coordina con el cierre. Permite clasificar un egreso de sesión ya
cerrada sin cambiar el movimiento ni su snapshot. El índice único existente
protege también carreras. Gasto, idempotencia y auditoría confirman o revierten
juntos. El reporte no resta además el movimiento de caja como otro gasto.

**Principal de deuda:** registrar amortización de capital como egreso de caja,
sin clasificarlo como gasto financiero. Financiero corresponde aquí a intereses
y comisiones; no usar esa clasificación para todo el pago de un préstamo.
Si un pago mezcla capital e intereses, registrar egresos separados antes de
vincular el gasto; no se admite vincular un importe parcial al mismo movimiento.
Los egresos no vinculados no se etiquetan automáticamente como capital: pueden
tener otras causas y requieren clasificación del operador. La API rechaza
`amortizacion_capital` como clasificación de gasto. La clasificación correcta
del concepto real depende del operador; no se infiere de texto libre.

`POST /gastos/categorias`: nombre (2-100) y booleano es_deducible_impuestos
explícito. Es un metadato registrado, no una determinación legal ni un cálculo.

`GET /gastos` admite desde/hasta, moneda/zona, sesión, clasificacion opcional,
`limite` 1-100 (50 inicial) y `despues` ID positivo; orden por ID, siguiente o
null. No aplica filtro de estado de venta a un gasto independiente.

## Archivos, errores y pruebas

| Archivo bajo backend | Función |
| --- | --- |
| `src/services/reportes-reglas.js` | Validar fechas, rango, filtros y gasto; convertir/formatear agregados exactos. |
| `src/services/reportes.service.js` | Consultas agregadas separadas, corte consistente, métricas y advertencias. |
| `src/services/gastos.service.js` | Categorías, registro transaccional con vínculo y listado paginado. |
| `src/routes/reportes.routes.js` | Sesión, permisos de lectura/escritura, contratos y errores de filtros. |
| `tests/reportes-reglas.test.mjs` | Tres pruebas puras de calendario, gasto, filtros y aritmética. |
| `tests/reportes-integracion.mjs` | HTTP/MySQL, fixtures, pagos mixtos, devoluciones, costos, gastos y rollback. |

Se actualizan app.js, mensajes del controlador compartido, package.json y README.
Respuestas: 400 datos/filtros; 401 sesión; 403 permiso/CSRF; 404 categoría;
409 duplicado de categoría/vínculo, importe de movimiento o clave conflictiva.

```powershell
npm.cmd run test:reportes
npm.cmd run test:reportes:integracion
```

Integración solo contra MySQL local de desarrollo. Crea usuarios/rol lector
temporales y fixtures; el negocio principal se revierte en transacción padre.
Los gastos/categoría del ensayo HTTP concurrente se eliminan por sus IDs propios.
Nunca editar FINANZAS ni usar una caja real. Verificado: permisos independientes
lector/escritor, CSRF, dos POST simultáneos con la misma identidad, filtros Lima/
UTC/estado/sesión, límites del día, venta mixta contada una vez, cambio de costo
vivo sin cambiar snapshot, costo pendiente, cuatro clases de gasto, no duplicar
egreso, principal aparte, devolución de venta antigua, margen incompleto y
rollback tardío de gasto/auditoría. También pasan las 48 pruebas unitarias backend.

PDF resumido: `DOCUMENTACION/FASES/FASE_39.pdf`, fuera del repositorio CODIGO.
Fase 40 conecta la interfaz y los gráficos a estas métricas oficiales.
