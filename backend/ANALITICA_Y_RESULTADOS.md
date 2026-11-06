# Análisis gerencial y estado de resultados

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
