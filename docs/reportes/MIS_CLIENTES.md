# Mis clientes: analítica gerencial

En **Reportes gerenciales → Mis clientes**, el administrador consulta la clientela
que compró en el periodo seleccionado. Comparte los filtros de fechas, canal,
estado, sesión de caja, responsable y zona horaria del reporte. Cambiar de vista
conserva la consulta y no vuelve a cargar los datos.

## Qué muestra

- Cuatro indicadores: clientes compradores, ingreso neto identificado, compras
  promedio por cliente y porcentaje de clientes con dos o más compras.
- Siete gráficos: mayores ingresos, mayor frecuencia, más unidades, nuevos y
  clientes que regresan, evolución diaria/mensual, tickets identificados frente
  a anónimos y productos favoritos de los clientes identificados.
- Oportunidades de atención y tabla exacta de los 20 clientes con mayor ingreso
  neto, con compras, días, unidades, promedio y última compra del filtro.

Se muestran hasta diez clientes por gráfico de ranking y diez productos. Los
indicadores consideran todos los compradores seleccionados, no solo el ranking.
Para periodos de más de 62 días, la evolución se agrupa por mes. Solo aparecen
días/meses con clientes compradores; el mismo cliente puede aparecer en varios.

## Criterios de cálculo

Una compra es un comprobante cobrado, no una visita física ni un pago parcial.
Los pagos mixtos no duplican compras ni dinero. Se excluyen ventas anuladas aun
cuando el estado elegido sea Todos; al elegir únicamente Anuladas, la vista queda
vacía. Los demás estados respetan la selección.

Ingreso neto identificado = ventas con IGV menos devoluciones acumuladas de esas
ventas a la fecha de consulta. Puede incluir devoluciones posteriores al periodo;
no equivale al flujo de caja del periodo ni a utilidad. Las unidades son brutas
del detalle histórico, sin descontar unidades devueltas.

Nuevo significa que su primera compra histórica no anulada ocurre dentro del
periodo. Esa primera compra se busca en todos los canales/sesiones/responsables,
para evitar clasificar como nuevo a quien ya había comprado antes por otro canal.
Los nombres provienen de la ficha actual; cada cliente se distingue por su ID.
Las ventas sin cliente se separan y no se asignan a una persona ficticia.

## Exportación y acceso

Con la vista abierta, pulsar **Guardar vista en PDF → Guardar como PDF** en el
diálogo del navegador. Incluye indicadores, gráficos, oportunidades y tabla; las
tablas de gráficos desplegadas también se incluyen. Se conserva el periodo y
alcance de la consulta. **Exportar CSV** descarga los datos de esta vista con los
mismos límites de ranking. Cada gráfico permite PNG y lectura exacta desplegable.

La ruta y API mantienen el permiso `reportes/leer`, que los perfiles estándar
otorgan al administrador. Los informes incluyen nombres de clientes: compartir
solo con personal autorizado. No se exportan teléfonos, documentos o direcciones.
No hay exportación durante una consulta pendiente o fallida. Diseño adaptable,
temas claro/oscuro y tablas con desplazamiento interno en pantallas pequeñas.

## Archivos y pruebas

| Archivo relativo a CODIGO | Función |
|---|---|
| `backend/src/services/reportes-clientes.js` | `analiticaClientes`: agrega cabeceras, unidades, primera compra, evolución y favoritos por separado; dinero con BigInt. |
| `backend/src/services/reportes.service.js` | Integra `clientes` en la respuesta transaccional existente. |
| `frontend/src/components/reportes/MisClientes.jsx` | Indicadores, siete gráficos, oportunidades y ranking exacto. |
| `frontend/src/utils/clientes-analitica.js` | Valida el contrato antes de dibujar/exportar. |
| `frontend/src/utils/reportes.js` | `csvClientes`: CSV con filtros, alcance y protección contra fórmulas. |
| `frontend/src/pages/Reportes.jsx` | Pestaña, filtros y exportación de la vista activa. |
| `frontend/src/styles/reportes.css` | Adaptación y presentación de fichas/oportunidades. |

Desde `backend/`: `npm.cmd run test:reportes:clientes` y
`npm.cmd run test:reportes:integracion`. Pruebas MySQL dentro de una transacción
revertida: nuevos históricos, fechas Lima, netos/devoluciones, pagos mixtos,
unidades, anonimato, estados y canales, sin conservar ventas de prueba.

Desde `frontend/`: `npm.cmd run test:reportes`, `npm.cmd run lint`,
`npm.cmd run build` y, con Vite activo, `npm.cmd run test:reportes:pdf`.
La prueba de navegador utiliza datos de prueba e imprime ocho vistas en total;
verifica los siete gráficos de clientes y anchos 320/390/768/1366/1920 en ambos
temas. No se agregaron tablas, migraciones ni dependencias.

## Lote persistente solicitado: 13/11/2026

Se registraron 23 ventas de salón por S/ 1,020.00, vinculadas aleatoriamente a
10 de los 12 clientes activos y a ocho mesas distintas. Son datos generados a
petición del propietario, conservados en la base local; las notas del pedido
identifican su origen. Afectan reportes, puntos, inventario y caja como el resto
de las ventas. No acreditan pagos físicos ni emisión fiscal.

Se utilizaron los empleados existentes: mesero Jean Franco Ramos Encalada,
cocinero Andrés Alejandro Salcedo Vega y cajero Hugo Flores. Caja 1, sesión 101,
apertura S/ 0.00; pagos registrados en efectivo. Se aplicó el IGV 18% indicado
por el propietario y precios finales con impuesto, corrigiendo la configuración
inicial pendiente mediante una actualización auditada.

El flujo usa los servicios del sistema: pedido y reserva, preparación/despacho,
consumo de insumos, bloqueo de pago, cobro, ticket y limpieza de la mesa. Las
46 líneas/tareas quedaron entregadas y las 356 reservas consumidas. Las nueve
mesas inicialmente libres terminaron libres; no se eliminaron las ventas.

- `backend/scripts/registrar-23-ventas.mjs`: inspección sin argumentos; la opción
  `--aplicar` registra este lote fijo. La opción adicional `--igv18` configura
  explícitamente el impuesto indicado. Claves idempotentes evitan repetir las
  mismas 23 ventas al relanzar el lote. Solo admite MySQL local de desarrollo.
- `backend/scripts/verificar-23-ventas.mjs`: verificación de solo lectura de ventas,
  pagos, tareas entregadas, reservas consumidas, Kardex, tickets y reportes.
- `DOCUMENTACION/REGISTROS/ventas23-20261113.json`: detalle de la ejecución,
  fuera de CODIGO. Contiene datos de clientes; mantener acceso autorizado.

Los registros residen en MySQL local. Subir el código a GitHub no respalda la base
de datos; el JSON documenta el lote y no sustituye un respaldo completo.

### Segundo lote: ventas y alertas de inventario

El lote `ventas19-stock-20261113` conserva otras 19 ventas, IDs 203 a 221, por
S/ 1,423.00. Reparto: Jean Franco Ramos Encalada, siete; Mesero de Prueba 01,
seis; Mesero de prueba 02, seis. Los 23 registros anteriores se mantienen:
ambos lotes suman 42 ventas y S/ 2,443.00 en la fecha de ejecución.

Se completaron 38 tareas hasta Entregado y 235 consumos con salidas de venta
en Kardex. Se comprobó que cada disminución física coincide exactamente con el
consumo del lote y que no quedan reservas propias pendientes. Se conservaron
las reservas previas de otros pedidos y se completó la limpieza de las mesas.

| Bebida/insumo | Antes | Después | Mínimo | Alerta |
|---|---:|---:|---:|---|
| Agua San Luis 625 ml | 34 | 0 | 0 | Sin disponible |
| Coca-Cola 500 ml | 36 | 4 | 6 | Stock bajo |
| Inca Kola 500 ml | 34 | 4 | 6 | Stock bajo |
| Coca-Cola 1 litro | 36 | 5 | 6 | Stock bajo |
| Inca Kola 1 litro | 35 | 5 | 6 | Stock bajo |

Los mínimos estaban en cero, por lo que se configuraron seis unidades como
umbral de reposición en las cuatro bebidas indicadas, con auditoría del
administrador. Ningún saldo físico fue reemplazado manualmente: las cantidades
se consumieron al completar preparación/despacho mediante los servicios.
La conciliación de los cinco insumos coincide con sus movimientos.

Desde `backend/`, `node scripts/registrar-19-ventas-stock.mjs` inspecciona el plan;
`--aplicar` ejecuta el lote fijo una sola vez. Las 19 ventas, sus movimientos y
la configuración de mínimos se confirman en una misma transacción.
`node scripts/registrar-19-ventas-stock.mjs --verificar` comprueba en modo lectura
los registros persistentes, pagos, tickets, reparto, reportes y alertas mediante
el mismo servicio que usa Inventario en la web. Repetir `--aplicar` sobre el lote
completo solo verifica; no añade otras ventas.

Detalle y verificación: `DOCUMENTACION/REGISTROS/ventas19-stock-20261113.json`
y `ventas19-stock-20261113-verificacion.json`, fuera de CODIGO. El origen generado
queda indicado en las notas del pedido; los cobros registrados son en efectivo
y afectan la caja del sistema, sin acreditar dinero físico.

### Ventas adicionales y resultado operativo positivo

El lote `ventas-resultado-positivo-20261113` conserva 56 ventas adicionales por
S/ 5,668.00: Jean Franco atendió 19, Mesero de Prueba 01 atendió 19 y Mesero de
prueba 02 atendió 18. Son registros generados a solicitud del propietario,
identificados en notas y auditoría. Se mantuvieron precios, recetas, costos y
los S/ 4,514.90 de gastos operativos registrados.

El plan considera disponibilidad real, costo consumido y base sin IGV. Completó
56 tareas, 494 salidas por venta en Kardex y 56 tickets. Los tres lotes totalizan
98 ventas y S/ 8,111.00. El resultado operativo del 13/11/2026 pasa de
−S/ 3,247.3565 a S/ 256.9438. Es anterior al impuesto a la renta; no se inventó
una provisión para completar el nivel neto. Inventario conserva cuatro insumos
con stock bajo y uno sin disponible.

`backend/scripts/ventas-resultado-positivo.mjs` planifica sin escribir por defecto;
`--aplicar` confirma el lote completo mediante los servicios transaccionales del
sistema. Si el lote existe, no añade ventas y lo verifica. `--verificar` sobre
el lote guardado comprueba ventas/pagos, reparto, tareas entregadas, reservas,
Kardex, tickets y resultado. Los detalles y la verificación se conservan en
`DOCUMENTACION/REGISTROS/ventas-resultado-positivo-20261113.json` y
`ventas-resultado-positivo-20261113-verificacion.json`.
