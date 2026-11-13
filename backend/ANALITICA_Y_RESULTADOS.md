# Análisis gerencial y estado de resultados

## Total de compras y otros gastos registrados

El resumen gerencial y la vista de compras muestran **Compras y otros gastos**:
compras confirmadas con IGV más los gastos registrados una sola vez. El mismo
desglose aparece en el resultado financiero, CSV y PDF de la vista. El gráfico
de clasificación incorpora **Compras de inventario**, además de gastos operativos,
financieros, extraordinarios y provisión. Las próximas compras confirmadas se
incluyen automáticamente sin crear gastos manuales duplicados.

Este total es administrativo: incluye documentos pendientes y provisiones; no
se presenta como flujo bancario ni reemplaza los gastos reconocidos del resultado.
La utilidad conserva el costo consumido y sus gastos clasificados. La función
`frontend/src/utils/compras-gastos.js` suma exactamente con BigInt; no cambia
asientos, inventario ni registros. El formulario de gastos indica que no se debe
registrar otra vez una compra existente. Prueba: S/9,954.90 + S/37.90 = S/9,992.80,
sin modificar utilidad, con importes grandes exactos y exportación consistente.

## Distribución para el administrador

Cada vista de las dos pantallas dispone de **Guardar vista en PDF**. Abre el
diálogo del navegador para seleccionar «Guardar como PDF». La copia de impresión
solo incluye el contenido de la vista elegida, nombre, fechas, filtros y momento
de consulta. Captura los gráficos como imágenes y espera su decodificación para
evitar páginas sin gráficos; conserva el estado de los detalles desplegados.
Las tablas incluyen los registros cargados (compras: últimos 50; gastos: página
actual), sin inventar un listado completo no consultado. El encabezado y el pie
explican ese alcance. Al cerrar/cancelar la impresión se elimina la copia y se
restaura el título, sin alterar la vista ni los gráficos originales.

`frontend/src/utils/reporte-pdf.js` prepara y limpia esta copia. No añade librerías
ni servicios externos. `npm.cmd run test:reportes:pdf` desde frontend genera PDFs
de las siete vistas con API interceptada y verifica título, filtros, gráficos,
limpieza y disponibilidad de la acción. También reproduce las tarjetas vacías
de meseros/24 horas sin actividad y proveedor con datos junto a gastos vacíos,
en ambos temas y entre 320 y 1920 píxeles.

Las tarjetas comparten una zona visual limitada y encabezados con botón PNG
alineado a la derecha. Una lista de horas a cero no reserva la altura de 24
barras: las categorías cero permanecen en la tabla exacta. Los rankings largos
se desplazan dentro de la tarjeta; el PDF muestra una imagen completa escalada.
La impresión quita menús, botones y límites de altura de las tablas, usa un fondo
claro y evita páginas vacías causadas por la altura mínima de la aplicación.

La vista inicial de gerencia es **Resumen**: ventas, compras, gastos y ticket
promedio, con una evolución diaria. **Ventas y atención** reúne los nueve
gráficos de ventas, horarios, productos y responsables. **Compras y gastos**
agrupa pagos pendientes, importes, proveedores y clasificación de gastos.
**Documentos y caja** contiene comprobantes, gastos paginados, movimientos y
medios de pago. Se elimina la larga secuencia de bloques repetidos de la portada.

Estado de resultados abre directamente en **Resultado del negocio**, con cuatro
indicadores explicados y su tabla de cálculo; comparte las vistas de compras
y documentos. La evolución diaria está en el resumen gerencial. Los importes
pendientes no se sustituyen por cero. Los detalles de clasificación y criterios
se despliegan cuando se necesitan.

**Registrar gasto** está en la cabecera de ambas páginas, para cuentas con
`configuracion/gestionar`. Abre un modal con el formulario existente; no se puede
cerrar mientras se confirma una escritura o se debe reintentar un resultado
incierto. Los filtros normales son fechas y periodos rápidos; **Más filtros**
despliega canal, responsable, sesión y zona. Cambiar de vista conserva filtros
y datos sin volver a consultar el reporte. CSV exporta todo el periodo;
impresión/PDF refleja la vista abierta.

La prueba de navegador valida navegación por las vistas, filtros conservados,
resultado visible primero, gráficos, documentos y modal de gasto. Revisa ambos
temas y anchos de 320 a 1920 píxeles, además de carga/error/ausencia de permisos,
PNG y reglas de impresión. No cambia cálculos financieros ni registros reales.

## Compras y actividad financiera visibles (13/11/2026)

El mes actual es ahora el periodo inicial de ambas pantallas. El filtro anterior
de siete días dejaba fuera el abastecimiento del 06/11 al consultar el 13/11.
Se conserva el acceso rápido de últimos siete días para consultas específicas.

Las dos páginas incorporan compras confirmadas con IGV, documentos saldados,
pendientes y parciales, gastos registrados, devoluciones y movimientos de caja.
Muestran cuatro gráficos adicionales: ventas/compras/gastos diarios, compras
por proveedor, gastos por clasificación e ingresos/egresos de caja. También
incluyen los últimos 50 documentos de compra, la lista paginada de gastos y
exportaciones CSV con actividad. Gerencial conserva sus nueve gráficos de
ventas; resultados conserva sus cuatro niveles de utilidad.

`src/services/reportes-actividad.js` consulta cabeceras separadas por dominio y
compone series y documentos dentro de la misma transacción del reporte.
`frontend/src/components/reportes/ActividadFinanciera.jsx` (ruta desde CODIGO)
comparte la presentación entre páginas; sus utilidades y CSV están en
`frontend/src/utils/reportes.js` y `resultados.js`.

Las compras son globales por fecha civil de emisión y estado actual de pago:
los filtros de mesero, canal y estado de venta no las eliminan. Gastos y caja
solo se limitan a sesión cuando su vínculo permite atribuirlos. Los borradores
se notifican pero no se suman hasta confirmar. Las compensadas/anuladas no se
presentan como compras confirmadas vigentes. Una compra no prueba un gasto
consumido ni una fecha de pago bancaria: no se resta nuevamente de la utilidad.
Los gastos vinculados a movimientos no deben sumarse otra vez como egresos.
Los abonos parciales carecen de importe desglosado; el saldo se mantiene como
desconocido cuando corresponda.

Validación: `npm.cmd run test:reportes:compras` en backend crea una compra de
dos líneas por S/118.00 (base S/100.00 + IGV S/18.00), la confirma, verifica stock,
serie diaria, proveedor, documento, cambio de pago y ausencia de doble descuento.
Todo vive en una transacción revertida. También pasó la integración anterior
de reportes y la consulta real del 01 al 13/11: seis compras por S/9,954.90.
`npm.cmd run test:reportes` en frontend incluye la nueva validación de actividad,
CSV y periodo mensual. La prueba de navegador usa API interceptada, comprueba
trece gráficos gerenciales/cuatro financieros, temas, estados, PNG y anchos
320-1920. Espera el ajuste de tamaño de Chart.js antes de medir desbordamiento.

Mejora de los módulos existentes, conforme a
`DOCUMENTACION/PANTALLAS/ADMINISTRADOR/pantallas_administrador_final.md`
y las reglas de pedidos, caja y reportes. No inicia una nueva fase de desarrollo.

## Dos secciones independientes

- `/reportes`: análisis de ventas y atención. Nueve gráficos: ventas diarias
  (línea), cobros por medio, productos top, productos con poca rotación, canales,
  atenciones por mesero, ventas atribuidas al mesero, ventas por hora y categorías.
  Además, mapa de calor semanal por hora y lista de productos activos sin ventas.
- `/estado-resultados`: finanzas en cuatro niveles, gastos clasificados,
  registro de gastos/categorías autorizado y control de compras pagadas/pendientes.

Ambas secciones tienen acceso protegido por `reportes/leer`, entradas independientes
en menú e Inicio, fechas inclusivas, zona horaria, sesión y periodos rápidos
(últimos siete días, mes, trimestre, año actual). La sección operativa permite
canal, estado de venta y responsable por nombre. Filtros personalizados se aplican
con botón; los periodos rápidos actualizan la consulta. Exportación deshabilitada
mientras se consulta para no mezclar filtros nuevos con datos anteriores.

## Qué mide la analítica

Importes por día/hora/canal se agregan desde cabeceras de ventas: varios medios
de pago no multiplican tickets ni importes. Las horas usan Lima o UTC según filtro.
Las consultas se ejecutan en la misma transacción de lectura del reporte.

Los productos usan `ventas_detalle_snapshot.cantidad`, agrupadas por producto,
con variantes juntas. Son unidades brutas vendidas, sin restar devoluciones;
el nombre y la categoría mostrados son los actuales del catálogo. No se comparan
precios actuales contra precios históricos para calcular estas unidades.
La baja rotación incluye los diez productos vendidos con menor cantidad;
los ceros se separan para evitar ocultar aquellos con ventas pequeñas.
Los ceros incluyen catálogo/categoría activos actualmente y no demuestran
disponibilidad durante todo el periodo. Se muestran hasta 50 de su total.

Meseros: cada cuenta de salón con venta seleccionada cuenta una **atención**.
Dos cuentas de una misma mesa son dos atenciones y una mesa física distinta.
Se atribuye al creador de la cuenta conservado en el pedido, no al cajero que
cobró ni a la asignación actual de la mesa. Esto no mide transferencias de
responsabilidad que no estén modeladas históricamente. El CSV incluye atenciones,
mesas distintas e importe atribuido. El ranking muestra hasta 20 responsables
ordenados por atenciones; no evalúa por sí solo desempeño, turnos o tamaño de mesa.

Los gráficos tienen datos exactos desplegables, PNG con contexto y fondo según
tema. El CSV operativo contiene filtros, serie diaria, rankings, canales, horas,
categorías, calor y medios; no mezcla el cálculo de utilidades. Los importes se
mantienen como decimales de texto/BigInt; Number solo se usa para escala visual.
Con datos vacíos se muestran estados vacíos y ceros donde corresponda. No se
crean ventas para llenar los gráficos.

## Estado de resultados

1. **Utilidad bruta:** ventas netas registradas sin IGV menos costo histórico
   consumido de la cohorte de ventas.
2. **Utilidad operativa:** utilidad bruta menos gastos operativos.
3. **Utilidad antes de impuestos:** operativa menos financieros y extraordinarios.
4. **Utilidad neta tras provisión:** anterior menos provisión de impuesto registrada.

La provisión se descuenta solo en nivel 4. No existe tasa automática universal
de impuesto a la renta. Sin provisión registrada, nivel 4 no disponible; sin
datos completos, los niveles calculados no disponibles en lugar de utilidad falsa.
Las devoluciones que requieren desglose no disponible mantienen las advertencias
de integridad existentes. El resultado no es cierre contable ni declaración fiscal.

Las compras abastecen inventario; sus pagos no vuelven a restarse como gastos de
la utilidad. Su control aparece aparte, global por fecha de emisión y estado de
pago actual. Los gastos del rango se muestran por fecha y sesión si están
vinculados. Filtrar una sesión excluye gastos globales no asignados, con aviso.

Usuarios con `configuracion/gestionar` pueden crear categoría y registrar gastos
desde esta sección: servicios, alquiler, sueldos, intereses, provisiones, etc.
No se crean egresos de caja automáticamente. Un egreso existente puede vincularse;
el backend exige mismo monto y que no esté vinculado a otro gasto. Una operación
con fallo ambiguo conserva datos/clave de idempotencia al reintentar.

Exportación CSV financiera separada y botón **Imprimir / guardar PDF** con CSS
A4, sin menú ni formularios. Guardar PDF utiliza el diálogo del navegador.

## Archivos y comprobaciones

- Backend: `reportes-analitica.js`, `reportes.service.js`, `reportes-reglas.js` y
  ruta `/api/reportes/resultados` (mismo permiso y fuentes históricas).
- Frontend: páginas `Reportes.jsx`, `EstadoResultados.jsx`, componentes
  `AnaliticaGraficos.jsx`, `GraficosGerenciales.jsx`, `EstadoFinanciero.jsx`,
  `RegistrarGasto.jsx`; utilidades `reportes.js`, `resultados.js` y estilos.
- Integración MySQL con rollback: snapshots, pagos mixtos sin duplicar unidades,
  filtros por canal/creador, límites Lima/UTC y cuentas repetidas en una mesa.
- Unitarias: filtros acotados, cuatro niveles exactos, compras no duplicadas,
  provisión ausente, datos corruptos y CSVs separados.
- Navegador con API interceptada: nueve canvas, PNG, filtros, permisos, estados
  vacío/error/carga, rutas independientes, gasto autorizado, temas claro/oscuro,
  ausencia de overflow en 320, 390, 768, 1366 y 1920 px, impresión sin navegación.

```powershell
# backend
npm.cmd run test:reportes
npm.cmd run test:reportes:integracion
# frontend
npm.cmd run test:reportes
npm.cmd run test:reportes:navegador
npm.cmd run lint
npm.cmd run build
```
