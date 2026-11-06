# Fase 40 - Interfaz gerencial y gráficos

Abrir **Reportes gerenciales** desde menú o Inicio, ruta `/reportes`, con sesión
y `reportes/leer`. La API también exige ese permiso. Módulo de consulta: usa los
contratos de fase 39 sin registrar gastos ni realizar movimientos/cobros.

## Uso y alcance

Al abrir se consulta la última semana civil de Lima, incluidas ambas fechas.
Editar desde/hasta, estado, sesión de caja (ID opcional) y zona horaria; pulsar
**Aplicar filtros** para consultar. Moneda PEN fija, máximo 366 días. Sesión en
blanco significa todas. Las fechas se interpretan según la zona elegida.

Los resultados muestran sus propios filtros oficiales y fecha de consulta.
El servicio comprueba que coincidan con lo solicitado. Durante otra consulta se
conserva la presentación previa, con aviso y exportaciones deshabilitadas;
respuestas anteriores se cancelan/descartan. Fallos temporales no fuerzan logout.
La identidad separa resultados y reinicia filtros al cambiar de empleado.

Indicadores: cantidad/total de ventas con impuesto, ticket promedio, devoluciones
por desembolso y gastos registrados. No mostrar tendencias de crecimiento si no
se consultó un periodo comparable. Dona: **cobros aplicados**, nunca vuelto ni
netos negativos. Devoluciones y neto están en la tabla equivalente. Barras:
ventas por fecha de emisión; días sin ventas se rellenan con cero dentro del
periodo oficial. Detalle diario accesible desplegable, sin depender del tooltip.

Costos históricos, base/impuesto registrados, resultado referencial y gastos
por clasificación conservan los valores del servidor. `null` se presenta como
**No disponible**, con advertencias legibles. No reconstruir un margen incompleto
ni inferir que una reserva pendiente tiene costo cero. Las salidas físicas y los
movimientos se consultan en un bloque separado; no sumarlos de nuevo como gastos.
Los criterios del backend se pueden desplegar en la pantalla.

Listado de gastos con categorías por nombre, fecha, clasificación, movimiento
vinculado e importe. Paginación por cursor, diez por página, con historial para
volver. Reutiliza periodo/zona/sesión; **el estado de venta no filtra gastos**.
La paginación no vuelve a consultar indicadores. Los gastos pueden tener otra
fecha contable que el pago. El registro autorizado continúa en la API documentada
en [backend/REPORTES.md](../backend/REPORTES.md).

## Gráficos y exportación

Dependencias nuevas exactas: **chart.js 4.6.1** y **react-chartjs-2 5.3.1**.
Registro explícito de elementos y escalas utilizados. La ruta usa lazy/Suspense:
la biblioteca gráfica se carga al entrar al módulo autorizado. Colores de marca
compartidos: dorado `#F59E0B`, rojo `#EF4444` y lima `#84CC16`. Tema y fondo del
canvas se actualizan al cambiar modo; gráficos sin animación en ambos casos.

Chart.js utiliza Number para las posiciones del dibujo. El texto, tablas,
tooltips y CSV conservan los importes string oficiales, incluidos valores grandes,
negativos y costos a cuatro decimales. No sumar dinero con Number en frontend.
La dona no representa devoluciones como segmentos negativos; muestra su tabla.

- **CSV:** resumen, filtros, fecha de consulta, advertencias, medios, gastos
  agrupados y serie diaria completa. No es una exportación de todas las páginas
  del listado de gastos. UTF-8 con BOM, separador punto y coma, comillas y escape;
  neutraliza fórmulas. Importes como texto para conservar precisión.
- **PNG de medios/ventas:** composición a partir del canvas con título, periodo,
  estado, sesión, moneda, zona y fecha de consulta. Medios añade leyenda con
  colores e importes exactos; ventas añade total. Fondo explícito para ambos
  temas, proporción del gráfico conservada y resolución del canvas duplicada.

Ningún archivo se sube al servidor: las descargas se generan en el navegador.
No incluye credenciales ni datos personales de clientes. No exportar una consulta
pendiente o fallida. El resultado sigue siendo una estimación interna; no es
declaración fiscal ni cierre contable. Hereda los límites temporales de fase 39.

## Accesibilidad y adaptación

Canvas con nombre/rol accesible y equivalencia HTML exacta; no depender de color,
mouse o imagen para leer cifras. Controles etiquetados, foco visible y botones
de al menos 44 px. Cuatro indicadores en escritorio, adaptación a dos/uno según
ancho; gráficos en dos columnas o una. Tablas de ancho flexible y contenedores
de detalle acotados. Mantener una página sin desbordamiento horizontal global.

## Archivos y funciones

| Ruta relativa a frontend | Responsabilidad |
| --- | --- |
| `src/pages/Reportes.jsx` | Filtros en edición/aplicados, indicadores, advertencias, costos y exportación. |
| `src/components/reportes/GraficosGerenciales.jsx` | Chart.js, dona/barras, temas, equivalencia HTML y descarga. |
| `src/components/reportes/GastosReporte.jsx` | Categorías y gastos paginados, sin escrituras. |
| `src/services/reportes.service.js` | Consultas cancelables, validación de alcance, descarga CSV y composición PNG. |
| `src/utils/reportes.js` | Validación, filtros iniciales Lima, importes exactos, días vacíos, etiquetas y CSV seguro. |
| `src/styles/reportes.css` | Indicadores, paneles, leyendas, tablas y adaptación. |
| `tests/reportes-fixture.mjs` | Respuestas sintéticas compartidas, sin datos reales. |
| `tests/reportes.test.mjs` | Cuatro pruebas de filtros, contrato, precisión/serie y exportación. |
| `tests/reportes-navegador.mjs` | Navegador con gráficos reales y API simulada; permisos, filtros y descargas. |

Se actualizan App.jsx, AdminLayout.jsx, Inicio.jsx, Icono.jsx, package.json y lock,
README principal y frontend. Sin cambios a tablas ni a la política de FINANZAS.

## Validación

```powershell
npm.cmd run test:reportes
npm.cmd run test:reportes:navegador
npm.cmd run lint
npm.cmd run build
```

Para navegador, mantener Vite activo. La prueba utiliza Edge headless/Playwright
con API simulada, gráficos reales, lectura de PNG/CSV descargados y sin escrituras
a la API. Se verifican lector, filtros explícitos, conservación durante carga,
paginación, netos negativos, null/advertencias, vacío, respuesta corrupta, fallos
sin logout y acceso denegado. Cinco tamaños: 320/390/768/1366/1920, claro/oscuro
y reduced-motion. Capturas y PNG exportado revisados visualmente.
Las **57 pruebas unitarias frontend**, ESLint y compilación pasan.

Referencias primarias: [react-chartjs-2](https://react-chartjs-2.js.org/),
[accesibilidad Chart.js](https://www.chartjs.org/docs/latest/general/accessibility.html),
[adaptación](https://www.chartjs.org/docs/latest/configuration/responsive.html).
PDF resumido: `DOCUMENTACION/FASES/FASE_40.pdf`, fuera del repositorio CODIGO.
Siguiente: fase 41, pruebas integrales de estrés local.
