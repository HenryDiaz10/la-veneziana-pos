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
