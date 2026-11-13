# Avance por fases

**Fase 40 implementada. Siguiente etapa planificada: fase 41, pruebas integrales de estrés local.**

Este registro describe cada entrega en su fecha; los pendientes de fases antiguas pueden estar resueltos. El estado actual se encuentra en el [índice general](../README.md).

- Fase 1: estructura inicial, repositorio Git y publicación en GitHub.
- Fase 2: backend inicial con Express, configuración de puerto y dirección,
  registros con Pino, CORS local, manejo de errores y cierre ordenado.
- Fase 3: frontend inicial con React y Vite, pantalla de comprobación,
  estilos básicos, revisión con ESLint y compilación de producción.
- Fase 4: Tailwind CSS, colores compartidos, fuentes locales con licencias,
  foco visible y comprobaciones iniciales de adaptación y teclado.
- Fase 5: configuración de entorno centralizada y validada,
  plantillas de desarrollo y producción, rechazo de configuración
  inválida y comprobaciones de privacidad en compilación y registros.
- Fase 6: conexión con MySQL mediante Sequelize y mysql2,
  verificación de CA, sesiones UTC, pool limitado, disponibilidad
  de la base y cierre ordenado de conexiones.
- Fase 7: modelos de seguridad, roles, permisos y auditoría,
  mapeados al SQL con comprobaciones de carga y configuración.
- Fase 8: modelos de catálogo, modificadores, unidades, insumos
  y recetas, con revisión de precisión decimal, referencias,
  índices y protección de asignaciones a columnas calculadas.
- Fase 9: modelos de operaciones, clientes, compras, inventario,
  pedidos, caja, ventas, devoluciones y soporte operativo.
  Revisión conjunta de los 51 modelos contra el SQL.
- Fase 10: 51 migraciones aplicadas en MySQL, asociaciones de los
  modelos, datos iniciales sin duplicados y pruebas reales de
  restricciones, columnas calculadas y consultas relacionadas.
- Fase 11: login HTTP con bcrypt, JWT firmado, bloqueo temporal
  por usuario, límite por IP y alta interactiva del administrador inicial.
- Fase 12: sesiones persistentes, autenticación y permisos por solicitud,
  gestión de empleados y roles, recuperación administrativa de acceso
  y base transaccional de autorizaciones sensibles de un solo uso.
- Fase 13: pantalla de login adaptable con logo original, formulario
  de vidrio, fuente Playfair Display local y efectos de interacción.
- Fase 14: login conectado, sesión con cookie HttpOnly, protección CSRF
  y estado de identidad en memoria con Zustand.
- Fase 15: navegación con React Router, rutas protegidas por sesión
  y permisos, retorno tras login y consulta de roles desde Seguridad.
- Fase 16: botones compartidos, etiquetas de estado, integración en Inicio
  y galería protegida de componentes disponible solo en desarrollo.
- Fase 17: layouts de administración y punto de venta, navegación por permisos
  y selector de modo claro/oscuro con preferencia guardada.
- Fase 18: tabla de datos reutilizable, con estados de carga, error y vacío,
  columnas configurables y desplazamiento horizontal dentro de su panel.
- Fase 19: API de categorías, productos, variantes y modificadores; búsqueda
  limitada de clientes, perfiles, direcciones y permisos de consulta/gestión.
- Fase 20: interfaces de Catálogo y Clientes, búsqueda, formularios, imágenes,
  activación/desactivación, eliminación sin relaciones, perfiles, direcciones
  e historial de puntos; renovación visual adaptable con los colores de la marca.
- Fase 21: API de recetas BOM, conversión exacta de unidades, receta por variante,
  deltas de extras/exclusiones y snapshot para tareas; pruebas unitarias y MySQL.
- Fase 22: constructor visual de recetas, selección de insumos, cantidades netas
  o brutas, conversión de unidades, vista previa y guardado completo por variante.
- Fase 23: servicios transaccionales de reserva, consumo, liberación y Kardex,
  promedio ponderado, costos históricos y pruebas de concurrencia/rollback en MySQL.
- Fase 24: monitor de almacén con físico/reservado/disponible, búsqueda y alertas,
  historial paginado, stock de productos directos y conciliación de solo lectura.
- Fase 25: proveedores, alta de insumos sin saldo inicial, compras en borrador,
  confirmación con ingreso/costo promedio y documento compensatorio autorizado.
- Fase 26: borrador de carrito por empleado, variantes y modificadores,
  edición, estimación decimal exacta y recuperación local sin credenciales.
- Fase 27: interfaz operativa del punto de venta, pantalla dividida
  con catálogo y recibo térmico, navegación adaptable para móviles,
  consultas operativas con ventas/cobrar y estimación en tiempo real.
  Incluye elección de presa para caldo de gallina e indicaciones por preparación,
  conservadas en el borrador y su revisión; envío real a cocina pendiente.
- Fase 28: API transaccional para crear/ampliar pedidos, reservar insumos,
  bloquear checkout, abrir caja y cobrar por separado. Snapshots comerciales,
  pagos mixtos, puntos, idempotencia y eventos durables. La integración visual
  de pagos y confirmación continúa en las fases 29 y 30.
- Fase 29: pantalla protegida de pagos de pedidos y modal adaptable para repartir
  el total oficial entre medios, referencias y verificación de pagos digitales,
  efectivo recibido/vuelto y canje condicionado. Prepara y revisa sin cobrar.
- Fase 30: registro del pedido desde el POS, apertura de caja y confirmación
  del cobro con recuperación idempotente tras desconexión o recarga. Limpieza
  selectiva del carrito confirmado y trabajo de impresión transaccional;
  agente local autenticado probado en simulación de 58/80 mm, sin impresión física.
- Fase 31: backend del cierre Z con conteo, diferencia y snapshot inmutable por
  servicio; movimientos de caja y devoluciones autorizadas con límites acumulados,
  conciliación por sesión/medio, compensación de puntos, idempotencia y pruebas
  de concurrencia y rollback en MySQL.

- Fase 32: interfaz responsive de arqueo, conteo directo o por denominaciones,
  movimientos autorizados, revisión y cierre oficial recuperable tras F5.
  Consulta del corte guardado y copias numeradas; agente de cierre probado
  en simulación de 58/80 mm, sin confirmación de impresión física.

- Fase 33: mapa protegido de salón con zonas, estados exactos del SQL,
  capacidad, coordenadas y mesero asignado; filtros y vista adaptable sin
  superposiciones. Consulta coherente de solo lectura, pruebas HTTP/MySQL
  y navegador. Las transiciones operativas continúan en fase 34.

- Fase 34: backend de mesas con ocupar/liberar/limpiar, revisión, idempotencia,
  responsable asignado y cuenta abierta vinculada. Registro/ampliación del
  pedido coordinados con la mesa; cobro deja por limpiar y limpieza libera.
  Auditoría, outbox, pruebas de carreras y rollback. El mapa sigue de consulta;
  los botones de estas acciones todavía no están conectados a la interfaz.

- Fase 35: recorrido completo de modificadores y notas: consulta operativa
  coherente, grupos obligatorios/múltiples/exclusivos, exclusiones visibles y
  snapshots con `es_exclusion` conservado para pedido, cocina y ticket.
  Pruebas de deltas, reserva/consumo, edición histórica, recuperación y móvil.

- Fase 36: publicación KDS después del commit mediante worker de outbox y
  WebSocket autenticado, avisos de cocina/despacho, reintentos con identidad
  estable, consulta paginada para recuperación y revisión continua de acceso.
  Transacciones y canales reales probados; el tablero visual continúa en fase 37.

- Fase 37: tablero protegido de cocina/despacho con etapas, cantidades, destino,
  opciones, exclusiones y notas; filtros y controles adaptables. Comandos REST
  con versión e identidad recuperable tras F5, consumo único al preparar o
  despachar, cancelación tardía autorizada e historial/outbox transaccional.
  Reconexión por snapshot y avisos deduplicados; listo y entregado separados.

- Fase 38: sonido de nuevas preparaciones activado por gesto, prueba/volumen,
  silencio temporal y alternativa visual; sin alarmar pendientes al reconectar.
  Reloj compartido anclado al servidor, tiempo por etapa/horno y total, umbrales
  locales configurables, texto/icono estáticos y pruebas de audio/reloj/responsive.
  Los recordatorios no determinan por sí solos el estado físico del producto.

- Fase 39: API gerencial con periodo/estado/sesión, PEN y zona horaria explícita,
  ventas y medios sin duplicación por pagos mixtos, devoluciones por desembolso,
  costos históricos y estimación condicionada a calidad. Registro autorizado e
  idempotente de gastos/categorías, vinculación a egresos sin doble conteo y
  separación de principal de deuda. Pruebas HTTP/MySQL y rollback con fixtures.

- Fase 40: pantalla gerencial protegida, indicadores, filtros aplicados,
  dona de cobros y barras diarias con Chart.js, tablas exactas, advertencias y
  consulta paginada de gastos. PNG con contexto/leyenda y CSV con datos y filtros;
  diseño adaptable, temas, reduced-motion y carga diferida del módulo gráfico.

## Mejoras posteriores a la fase 40

- Recetario y mermas, proveedores y abastecimiento.
- Reportes financieros, compras y gastos, PDF por vista.
- Gestión de trabajadores, cajas, zonas y mesas.
- Confirmación dentro del recibo, tickets en 58/80 mm y navegación estable.
- Pedidos del mesero, límites por perfil y listado administrativo de clientes.
- Historial de ventas con filtros, productos y pagos históricos.
- Organización temática de la documentación y comprobación de enlaces.

Detalles previos: [desarrollo general](DESARROLLO.md) e [historial del frontend](FRONTEND.md).
