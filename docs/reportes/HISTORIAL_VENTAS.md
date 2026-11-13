# Historial de ventas de clientes

> Rutas y comandos: salvo indicación expresa, las rutas de código y los comandos de esta guía son relativos a `backend/`, no a la carpeta del documento.

Sección del administrador en `/historial-ventas`, disponible en el menú e Inicio
con `reportes/leer`. Es de consulta; no registra nuevas ventas, cobros o devoluciones.

## Información y filtros

- Tabla paginada de 10 operaciones con fecha/hora de Lima, ticket, pedido, canal,
  mesa, cliente, teléfono, importe, estado, medios de pago y acceso al detalle.
- Fechas inclusivas, estado de emisión, canal y medio de pago. Búsqueda por
  nombre o teléfono del cliente, documento actual, código de ticket o de pedido.
  Se aplica con **Aplicar filtros** y se conserva al cambiar de página.
  **Limpiar filtros** vuelve al mes actual hasta hoy, con todos los estados.
- Resumen de todos los resultados del filtro, no solo de la página visible:
  cantidad de operaciones, importe de ventas vigentes, importe devuelto y neto.
- Detalle con responsable del pedido, cajero, productos históricos, variantes,
  modificadores/exclusiones, indicaciones, base, IGV, descuento, total, pagos,
  efectivo recibido/vuelto y devoluciones registradas.

Las ventas sin cliente asociado muestran **Cliente no registrado**. Para nombre
y teléfono se prioriza el snapshot del cobro; para registros antiguos se utiliza
el snapshot del pedido y, si falta, la ficha actual. El documento de búsqueda
procede de la ficha actual; no se presenta como documento histórico congelado.

## Criterios de cálculo

- Cada venta aparece una vez. El filtro de medio usa `EXISTS`, evitando duplicar
  una venta que combina efectivo, Yape u otros medios.
- Al filtrar por un medio se muestra el importe completo de la venta que lo usó,
  y todos sus pagos; no solo el importe aportado por ese medio.
- Operaciones cuenta todos los estados seleccionados. Ventas vigentes excluye
  anuladas e incluye los cobros con rechazo SUNAT si están dentro del filtro.
- Devuelto suma las devoluciones de esas ventas vigentes a fecha de consulta,
  aunque el reembolso sea posterior al periodo de la venta. Neto es la resta.
  Este historial no sustituye el estado de resultados ni el flujo de caja.
- Los productos proceden de `ventas_detalle_snapshot`, con precios, opciones y
  notas guardadas al cobrar. Nunca se recalculan con el catálogo actual.
  Los registros sin detalle histórico lo indican explícitamente.
- Importes agregados: SQL DECIMAL y formato con BigInt, sin sumar dinero con Number.
  Fechas de Lima: límites UTC `[inicio, fin)`; máximo 366 días inclusivos.

## Rutas y archivos

`GET /api/reportes/ventas`: requiere `desde` y `hasta`; acepta `estado`, `canal`,
`medio`, `busqueda`, `pagina` y `limite`. Límite máximo 50, página máxima 10000,
búsqueda máxima 150 caracteres. Los parámetros desconocidos o inválidos se rechazan.
`GET /api/reportes/ventas/:id`: consulta el detalle con ID entero positivo.
Ambas rutas requieren sesión y `reportes/leer`. Los perfiles estándar mesero,
cajero y cocinero no tienen ese permiso; el frontend bloquea también su URL.

- `src/services/historial-ventas.service.js`: filtros, agregación, listado y detalle.
  SQL parametrizado, comodines literales en búsqueda y lectura transaccional consistente.
- `src/routes/reportes.routes.js`: autorización y rutas de consulta.
- `frontend/src/pages/HistorialVentas.jsx`: filtros, indicadores, tabla y modal.
- `frontend/src/services/historial-ventas.service.js`: consultas cancelables y
  comprobación básica de respuestas. No persiste búsquedas o clientes en localStorage.
- `frontend/src/utils/accesos.js` y `App.jsx`: sección protegida para administración.

## Verificación

`node tests/historial-ventas-integracion.mjs` desde backend: fechas Lima, ventas
mixtas sin duplicados, anuladas, devoluciones, búsqueda literal/inyección,
paginación, snapshots y 401/403/400 con usuarios reales locales. Los registros
comerciales de prueba se revierten; las cuentas y sesiones temporales se eliminan.

`frontend/tests/historial-ventas-navegador.mjs`: filtros, paginación, detalle,
pagos, devoluciones, texto seguro, vacío, limpiar, reintentos y pantallas de 320 a
1366 px. Se actualizaron las matrices de accesos para incorporar la nueva sección.
