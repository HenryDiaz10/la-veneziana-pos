## Estado del proyecto

**Avance actual: fase 35 implementada y probada.**
La siguiente etapa es la **fase 36: backend de eventos KDS al confirmar pedidos**.

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

Detalle y contrato: [backend/PEDIDOS.md](backend/PEDIDOS.md).
Interfaz de pagos: [frontend/PAGOS.md](frontend/PAGOS.md).
Integración y agente: [VENTA_FINAL.md](VENTA_FINAL.md).
Cierres y devoluciones: [backend/CAJA.md](backend/CAJA.md).
Interfaz de arqueo: [frontend/ARQUEO.md](frontend/ARQUEO.md).
Mapa de mesas: [frontend/SALON.md](frontend/SALON.md).
Operaciones de mesas: [backend/MESAS.md](backend/MESAS.md).
Modificadores y notas: [MODIFICADORES_NOTAS.md](MODIFICADORES_NOTAS.md).

**Sesiones actuales:** ocho horas desde el login aunque no haya interacción,
sin cierre por inactividad a los quince minutos. Los fallos temporales de conexión no desmontan
formularios ni equivalen a logout. Implementación y pruebas:
[backend/SESIONES.md](backend/SESIONES.md).

El frontend permite ingresar, recuperar la sesión al recargar y cerrarla;
administrar Catálogo y Clientes según permisos y consultar los roles en Seguridad.
Las rutas /inicio, /pos, /catalogo, /recetas, /inventario, /compras, /clientes, /caja, /salon y /seguridad exigen sesión;
las secciones de negocio comprueban también su permiso específico.
El POS permite revisar y registrar pedidos; Pagos confirma el cobro con caja
propia, versión y bloqueo vigentes. Solo la confirmación oficial permite retirar
las líneas pagadas del borrador. Los resultados desconocidos quedan pendientes
de recuperar, incluso tras F5, sin generar otra identidad de cobro.
El constructor de recetas está conectado a la API y requiere catalogo/gestionar.
La cookie es HttpOnly; no se guarda el JWT en Zustand ni en localStorage.
El backend ya se conecta
con MySQL y tiene creadas las 51 tablas del SQL de referencia,
con sus modelos y asociaciones disponibles desde src/models/index.js.

El backend dispone de autenticación, gestión de empleados y roles, catálogo,
clientes, direcciones, recetas, pedidos y cobros separados, con rutas protegidas
por permisos. Ya hay borrador de carrito y apertura mínima de caja. Siguen
pendientes la confirmación visual del cobro, KDS en vivo, cierres y devoluciones, entre
otros módulos de las fases siguientes. Las autorizaciones sensibles se
integrarán en ajustes y devoluciones cuando se implementen esos módulos.

Las secciones por fase describen lo realizado en cada etapa.
Los pendientes de migraciones y asociaciones mencionados en las
fases 7 a 9 se resolvieron en la fase 10. El detalle de las fases posteriores
también se conserva más abajo y en la documentación específica del backend.

## Preparación del backend

Ejecutar desde la carpeta CODIGO:

```powershell
# Entramos a la carpeta del backend.
cd backend

# Instalamos las versiones guardadas en package-lock.json.
npm.cmd ci

# Creamos la configuración local al preparar el proyecto por primera vez.
# Conservamos cualquier .env existente.
if (-not (Test-Path -LiteralPath .env)) {
  Copy-Item -LiteralPath .env.example -Destination .env
}
```

La configuración de ejemplo utiliza el puerto 3000 y la dirección
127.0.0.1 para HTTP, y el puerto 3307 para MySQL local. El archivo
.env es privado y no se sube a Git.

Antes de iniciar el backend, completar su `.env` con:

- `JWT_SECRET`: secreto generado con al menos 32 bytes aleatorios,
  representado en hexadecimal. No utilizar un texto de ejemplo.
- `DATABASE_HOST`, `DATABASE_PORT` y `DATABASE_NAME`: destino real
  de la conexión; en este equipo, 127.0.0.1, 3307 y la_veneziana.
- `DATABASE_USER` y `DATABASE_PASSWORD`: cuenta de aplicación y
  contraseña correspondientes; no utilizar la cuenta root en el backend.
- `DATABASE_CA`: ruta al certificado público de la CA, accesible
  para la cuenta de Windows que ejecutará Node. No utilizar una clave privada.

Copiar la plantilla no basta para arrancar: sus secretos y la ruta CA
están vacíos. Crear la base y la cuenta en MySQL antes de probar `/ready`.

## Ejecución del backend

Ejecutar desde la carpeta CODIGO/backend:

```powershell
# Iniciamos con reinicio automático al modificar el código.
npm.cmd run dev
```

Para ejecutar sin reinicio automático:

```powershell
# Iniciamos el servidor mediante el script start.
npm.cmd start
```

Consultar http://127.0.0.1:3000/health para comprobar que el proceso
HTTP responde. Esta ruta no consulta MySQL.

Consultar http://127.0.0.1:3000/ready para comprobar la conexión
con MySQL: responde 200 si está disponible y 503 si falla.

Una configuración inválida impide el arranque. Una caída de MySQL
con configuración válida no detiene el proceso HTTP: `/health` continúa
respondiendo y `/ready` indica indisponibilidad.

CORS utiliza el origen configurado en `CORS_ORIGIN`; durante el
desarrollo local es http://localhost:5173.

Para comprobar el cierre ordenado directamente desde PowerShell:

```powershell
# Ejecutar sin el envoltorio de npm ni el modo de reinicio automático.
node src/server.js
```

Presionar Ctrl + C una vez y esperar los mensajes de cierre del pool
y del servidor. Esta fue la forma utilizada para verificar el cierre;
interrumpir el trabajo por lotes de npm puede cortar la salida antes
de completar esa comprobación.

## Ejecución del frontend

Ejecutar desde la carpeta CODIGO/frontend:

```powershell
# Instalamos las dependencias al preparar una nueva copia del proyecto.
npm.cmd ci

# Creamos la configuración pública local solo si no existe.
if (-not (Test-Path -LiteralPath .env)) {
  Copy-Item -LiteralPath .env.example -Destination .env
}

# Iniciamos el servidor de desarrollo.
npm.cmd run dev
```

Abrir http://localhost:5173. El puerto está fijado; si está ocupado,
Vite muestra un error.

Para revisar y compilar, utilizar otra terminal en CODIGO/frontend:

```powershell
# Revisamos el código mediante ESLint.
npm.cmd run lint

# Generamos los archivos de producción en dist.
npm.cmd run build
```

Las instrucciones completas están en frontend/README.md.

## Archivos y configuración

Las dependencias, los archivos generados y la configuración privada
están excluidos mediante .gitignore.

Los archivos .env.example contienen únicamente ejemplos sin secretos.
Los archivos package-lock.json se conservan en Git para reproducir
las versiones de las dependencias.

## Configuración de entorno y seguridad base

El backend utiliza `src/config/env.js` para cargar y validar el entorno,
puerto HTTP, host no vacío, origen CORS, formato del secreto JWT y
parámetros básicos de MySQL: host no vacío, puerto y nombre de la base.

El backend utiliza DATABASE_USER, DATABASE_PASSWORD y DATABASE_CA
desde su .env privado. src/config/database.js exige credenciales
no vacías y un certificado CA legible antes de preparar la conexión.

En la fase 5 se preparó y validó el secreto JWT. La firma de tokens
se incorporó en la fase 11; su verificación en rutas protegidas
corresponde a la fase 12.

El frontend valida `VITE_API_URL` mediante `src/config/env.js`.
Si la configuración es inválida, muestra “Sistema no disponible”
sin sustituir silenciosamente la dirección.

Los archivos `.env` son privados. Los archivos `.env.example` y
`.env.production.example` documentan la configuración sin secretos.
Las variables `VITE_` son públicas y no deben contener credenciales.

En desarrollo se utiliza `http://127.0.0.1:3000`. Para publicación
conjunta, la plantilla del frontend utiliza `/api`; el servidor de
producción deberá dirigir esa ruta al backend.

### Comprobaciones realizadas

- API `/health`: respuesta HTTP 200 y origen CORS configurado.
- Backend: rechazo de JWT vacío, puerto HTTP inválido,
  origen CORS inválido y puerto MySQL inválido.
- Frontend: aviso ante una dirección API inválida y recuperación
  al restaurar la configuración correcta.
- ESLint y compilación del frontend completados sin errores.
- Secreto JWT y contraseña MySQL ausentes de los 18 archivos
  del frontend compilado revisados, mediante búsqueda de valores exactos.
- Pino elimina las rutas de campos sensibles configuradas,
  comprobado mediante valores ficticios.

## Conexión con MySQL — fase 6

### Entorno local

- MySQL Community Server 8.4.11, servicio Windows MySQL84.
- Host 127.0.0.1 y puerto 3307.
- Base la_veneziana, con utf8mb4 y utf8mb4_unicode_ci.
- Usuario la_veneziana_app, limitado al origen localhost.
- Permisos SELECT, INSERT, UPDATE y DELETE sobre la_veneziana.
- La cuenta exige conexiones cifradas mediante REQUIRE SSL.
- Workbench 26.7.0 se utiliza para administración; la aplicación
  no necesita que Workbench permanezca abierto.

La contraseña y la ruta local del certificado se configuran solo
en backend/.env. No publicar contraseñas ni claves privadas.

La base permanece sin tablas de negocio. Se creó una tabla técnica
para comprobar rollback y se eliminó al finalizar. Las tablas del
sistema se crearán mediante migraciones en la fase correspondiente.

### Configuración compartida

src/config/database.js exporta una instancia de Sequelize.

- Sesiones en UTC mediante timezone: '+00:00'.
- Consultas automáticas sin impresión SQL.
- Pool: máximo 5 conexiones, mínimo 0.
- Espera para adquirir conexión: 5000 ms.
- Tiempo de conexión inicial: 5000 ms.
- Retiro de conexiones inactivas: 10000 ms; revisión cada 1000 ms.
- Verificación de certificados con la CA configurada.
- En desarrollo local no se verifica el nombre del certificado
  autogenerado. En producción y conexiones no locales sí se exige
  verificar la identidad del servidor.

El cierre espera a que terminen las solicitudes HTTP y después
cierra el pool de Sequelize, manteniendo el límite de diez segundos.

### Dependencias

Sequelize 6.37.8 y mysql2 3.24.6 están fijados como versiones exactas.

Se aplica un override de uuid 11.1.1 para Sequelize, para corregir
el aviso de seguridad detectado. Se comprobó la generación de
UUID v1 y v4 y el funcionamiento de transacciones reales.

El último npm audit reportó cero vulnerabilidades. El aviso de
obsolescencia de dottie se distingue de los avisos de seguridad.

### Comprobaciones realizadas

- Conexión con el usuario de aplicación, base y puerto esperados.
- Sesión UTC y conexión cifrada.
- Rechazo de una CA incorrecta.
- Pool ocupado con cinco conexiones: espera agotada y recuperación
  después de finalizar las transacciones.
- Escritura revertida por rollback y consulta posterior correcta.
- MySQL detenido: /health conserva 200 y /ready devuelve 503.
- MySQL recuperado: /ready vuelve a 200.
- Cierre del pool y del servidor mediante SIGINT.
- Sintaxis de database.js, app.js y server.js revisada con node --check.
- Secreto JWT y contraseña MySQL ausentes de la compilación revisada.

Las comprobaciones son pruebas manuales; no constituyen una
auditoría completa ni una suite automatizada.

## Modelos de seguridad y auditoría — fase 7

### Archivos creados

Los modelos utilizan la instancia compartida de src/config/database.js.

| Archivo | Modelo | Tabla SQL |
|---|---|---|
| backend/src/models/Rol.js | Rol | roles |
| backend/src/models/Permiso.js | Permiso | permisos |
| backend/src/models/RolPermiso.js | RolPermiso | rol_permisos |
| backend/src/models/Usuario.js | Usuario | usuarios |
| backend/src/models/AuditLog.js | AuditLog | audit_logs |

### Configuración

- Nombres de tablas y columnas explícitos, basados en el SQL.
- RolPermiso utiliza una clave primaria compuesta:
  rol_id y permiso_id, sin un id adicional.
- Permiso declara un índice único sobre modulo y accion.
- Usuario referencia su rol mediante rol_id.
- Contraseña y PIN se representan mediante campos de hashes.
  El modelo no genera esos hashes ni implementa autenticación.
- AuditLog conserva BIGINT, JSON y los tipos de eventos del SQL.
- AuditLog tiene fecha de creación, sin fecha de modificación.
- Las referencias conservan las reglas CASCADE, RESTRICT y SET NULL
  correspondientes al SQL.

Las fechas TIMESTAMP del SQL se representan mediante DataTypes.DATE.
Las migraciones conservarán sus tipos y reglas en MySQL.

### Comprobaciones realizadas

- Sintaxis de los cinco archivos revisada con node --check.
- Carga conjunta de los cinco modelos.
- Instancia de Sequelize compartida.
- Nombres de tablas y listas completas de columnas.
- Claves primarias, incluida la clave compuesta de RolPermiso.
- Tipos y longitudes principales, referencias y reglas de eliminación.
- Valores de ENUM, valores predeterminados seleccionados e índices.

Las comprobaciones se realizaron sobre la configuración en memoria,
sin ejecutar consultas ni crear tablas.

### Alcance pendiente

La definición de los modelos no crea tablas ni registra auditoría
automáticamente. No se utilizó sequelize.sync().

Las asociaciones y las migraciones corresponden a la fase 10.
Las restricciones reales se probarán en MySQL después de crear
las tablas. La autenticación, autorización y protección del
historial de auditoría se implementarán en las fases correspondientes.

## Modelos de catálogo, modificadores y recetas — fase 8

### Archivos creados

Los nueve modelos utilizan la instancia compartida de
backend/src/config/database.js.

| Archivo en backend/src/models | Modelo | Tabla SQL |
|---|---|---|
| CategoriaVenta.js | CategoriaVenta | categorias_venta |
| ProductoVenta.js | ProductoVenta | productos_venta |
| VarianteProducto.js | VarianteProducto | variantes_producto |
| ModificadorCatalogo.js | ModificadorCatalogo | modificadores_catalogo |
| ModificadorItem.js | ModificadorItem | modificadores_items |
| ProductoModificador.js | ProductoModificador | producto_modificadores |
| UnidadMedida.js | UnidadMedida | unidades_medida |
| InsumoAlmacen.js | InsumoAlmacen | insumos_almacen |
| RecetaBom.js | RecetaBom | recetas_bom_master |

### Configuración

- Se conservan nombres, tipos y nulabilidad del SQL, incluidos
  los cambios posteriores declarados mediante ALTER TABLE.
- ProductoModificador utiliza una clave primaria compuesta:
  producto_id y grupo_id.
- VarianteProducto declara el índice único uq_variante_producto
  sobre id y producto_id.
- RecetaBom declara el índice único
  uq_bom_producto_variante_insumo sobre producto_venta_id,
  variante_clave e insumo_id.
- ProductoVenta utiliza precio_venta_base como precio base e incluye
  la referencia opcional insumo_directo_id.
- Los importes de productos, variantes y modificadores conservan
  DECIMAL(12,2).
- Los costos y cantidades de almacén conservan DECIMAL(12,4).
- La cantidad bruta de receta utiliza DECIMAL(12,4) y su porcentaje
  de merma utiliza DECIMAL(5,2).
- Solo ProductoVenta tiene created_at y updated_at en este grupo.

### Columnas calculadas

margen_ganancia_teorico de ProductoVenta y variante_clave de
RecetaBom son columnas calculadas por MySQL.

Sus setters rechazan asignaciones normales mediante Sequelize.
Las futuras operaciones de escritura deberán excluir expresamente
estas columnas, incluidas las operaciones masivas.

Las migraciones conservarán sus expresiones GENERATED ALWAYS.
No se utilizó sequelize.sync().

### Inventario y recetas

El saldo físico se representa mediante insumos_almacen.stock_fisico.
stock_reservado representa cantidades comprometidas; el disponible
se calculará como stock_fisico menos stock_reservado.

productos_venta.stock_actual se conserva por correspondencia con
el SQL; no será una fuente independiente del saldo de inventario.

Las cantidades de receta se expresan en la unidad base del insumo.
Una receta completa de variante sustituirá a la receta base.

Los modelos no convierten unidades, reservan inventario, consumen
insumos ni calculan costos automáticamente.

### Comprobaciones realizadas

- Sintaxis de los nueve archivos revisada con node --check.
- Carga conjunta de los nueve modelos.
- Instancia de Sequelize compartida.
- Nombres de tablas y listas completas de columnas.
- Claves primarias, incluida la compuesta de ProductoModificador.
- Precisión y escala de los campos DECIMAL revisados.
- Nulabilidad y valores predeterminados de los saldos y costos
  de almacén revisados.
- Destinos y reglas de las referencias declaradas.
- Índices únicos compuestos de variantes y recetas.
- Rechazo de asignaciones normales a las dos columnas calculadas,
  utilizando instancias construidas en memoria.

Las pruebas no ejecutaron consultas ni guardaron registros.
No comprobaron todavía las restricciones reales de MySQL.

### Alcance pendiente

Las asociaciones y migraciones se implementarán en la fase 10.
Las migraciones conservarán las columnas generadas, los CHECK
y la clave foránea compuesta que verifica que una variante
pertenezca al producto indicado en la receta.

Las reglas de selección de modificadores, precios, unidades,
recetas, reservas y consumo se implementarán en sus servicios
correspondientes.

## Modelos de operaciones y soporte — fase 9

### Archivos creados

Se añadieron 37 modelos en backend/src/models.
Todos utilizan la instancia compartida de src/config/database.js.

| Modelo y archivo .js | Tabla SQL |
|---|---|
| Cliente | clientes |
| DireccionCliente | direcciones_clientes |
| CrmMovimientoPuntos | crm_movimientos_puntos |
| ProveedorMaestro | proveedores_maestro |
| CompraFactura | compras_facturas |
| CompraDetalle | compras_detalle |
| InventarioKardex | inventario_kardex |
| ZonaRestaurante | zonas_restaurante |
| MesaSalon | mesas_salon |
| PedidoMaster | pedidos_master |
| PedidoItemKds | pedido_items_kds |
| PedidoItemModificador | pedido_item_modificadores |
| CajaFisica | cajas_fisicas |
| SesionCajaZ | sesiones_caja_z |
| MovimientoCajaChica | movimientos_caja_chica |
| VentaComprobante | ventas_comprobantes |
| VentaPagoSplit | ventas_pagos_split |
| CategoriaGastoFijo | categorias_gastos_fijos |
| GastoFinancieroOperativo | gastos_financieros_operativos |
| ConfiguracionGlobal | configuracion_global |
| ModificadorBom | modificadores_bom |
| ComboComponente | combo_componentes |
| KdsTarea | kds_tareas |
| ReservaInsumo | reservas_insumos |
| KdsHistorial | kds_historial |
| IdempotenciaOperacion | idempotencia_operaciones |
| EventoOutbox | eventos_outbox |
| TrabajoImpresion | trabajos_impresion |
| VentaDetalleSnapshot | ventas_detalle_snapshot |
| SerieComprobante | series_comprobantes |
| ComprobanteFiscal | comprobantes_fiscales |
| VentaDevolucion | ventas_devoluciones |
| DevolucionDetalle | devoluciones_detalle |
| DevolucionPago | devoluciones_pagos |
| AutorizacionSensible | autorizaciones_sensibles |
| IncidenciaOperativa | incidencias_operativas |
| AuthSesion | auth_sesiones |

### Ajuste de un modelo anterior

Se completó Usuario.js con intentos_fallidos y bloqueado_hasta,
añadidos mediante ALTER TABLE en el SQL de referencia.
El modelo no implementa todavía el bloqueo de cuentas.

El conjunto contiene 51 modelos: 5 de la fase 7,
9 de la fase 8 y 37 de la fase 9.

### Configuración relevante

- Se conservan INT, BIGINT, SMALLINT, CHAR, VARCHAR, DECIMAL,
  ENUM, JSON y sus representaciones correspondientes en Sequelize.
- ConfiguracionGlobal utiliza parametro_key como clave primaria,
  sin id numérico.
- ModificadorBom utiliza una clave primaria compuesta.
- Se conservan los nombres particulares de fechas de cada tabla.
- Los campos version preparan contadores; no activan por sí solos
  control de concurrencia.
- Los identificadores de operación y sus índices preparan el
  control de duplicados; no implementan por sí solos idempotencia.
- Los modelos de outbox e impresión describen almacenamiento;
  todavía no publican eventos ni procesan impresoras.

### Comprobaciones realizadas

Las revisiones se ejecutaron mediante scripts manuales en memoria,
leyendo el SQL como texto sin ejecutarlo.

- Sintaxis de los archivos creados y del ajuste de Usuario revisada.
- Carga y correspondencia de columnas y claves primarias.
- 51 modelos y 436 campos revisados en tipos y nulabilidad.
- Longitudes de texto, precisión decimal y valores de ENUM.
- 163 valores predeterminados declarados en el SQL.
- 47 campos autoincrementales y ausencia de autoincrementos adicionales.
- 79 referencias individuales y sus reglas de eliminación y actualización.
- 30 índices con nombre: unicidad, columnas y orden.
- 19 campos con unicidad individual.

Se identificaron cuatro claves foráneas compuestas pendientes
de crear mediante migraciones, desde recetas_bom_master,
pedido_items_kds, combo_componentes y kds_tareas hacia
variantes_producto.

Los analizadores utilizados están adaptados al formato del SQL
del proyecto; no son analizadores SQL generales.

### Columnas calculadas

Se comprobaron en memoria las cinco columnas:

- ProductoVenta.margen_ganancia_teorico.
- RecetaBom.variante_clave.
- PedidoMaster.mesa_activa_id.
- SesionCajaZ.caja_abierta_id.
- SesionCajaZ.cajero_abierto_id.

Sus setters rechazaron asignaciones normales.
La carga simulada mediante raw: true conservó los valores.

Esta protección no cubre todas las vías de escritura.
Los servicios deberán excluir expresamente estas columnas,
incluidas las operaciones masivas.

No se probó todavía su cálculo real en MySQL.

### Alcance pendiente

No se utilizó sequelize.sync() ni se crearon tablas en esta fase.
Las comprobaciones no ejecutaron consultas ni guardaron registros.

La fase 10 incorporará migraciones, asociaciones y datos iniciales,
con pruebas reales de restricciones, índices y columnas generadas.

La autenticación, autorizaciones, cálculos, reservas, consumo,
cobros, devoluciones, cierres, eventos e impresión requieren
servicios y validaciones en sus fases correspondientes.

Las revisiones manuales no constituyen una suite automatizada
ni una auditoría completa del sistema.

## Migraciones, asociaciones y datos iniciales — fase 10

### Conexión independiente para migraciones

El entorno local utiliza MySQL 8.4.11 en 127.0.0.1:3307 y la base
la_veneziana. Se comprobó que estaba vacía antes de inicializarla.

- La aplicación utiliza la cuenta la_veneziana_app@localhost,
  con permisos SELECT, INSERT, UPDATE y DELETE sobre la base.
- Las migraciones y seeds utilizan la cuenta
  la_veneziana_migraciones@localhost, con esos permisos y además
  CREATE, ALTER, DROP, INDEX y REFERENCES sobre la misma base.
- La cuenta de migraciones requiere SSL. Las conexiones verifican la CA;
  también verifica la identidad del servidor en producción y
  en conexiones no locales, según la configuración existente.
- Las sesiones trabajan en UTC. El proceso de migraciones limita
  su pool a una conexión y lo cierra al terminar.

Desde backend, crear la configuración privada una sola vez:

```powershell
if (-not (Test-Path -LiteralPath '.env.migrations')) {
  Copy-Item -LiteralPath '.env.migrations.example' -Destination '.env.migrations'
}

git check-ignore -v -- .env.migrations
```

Completar DATABASE_PASSWORD con la contraseña de la cuenta de
migraciones y DATABASE_CA con la ruta real del certificado.
La plantilla contiene el resto del destino local y NODE_ENV.
El archivo privado queda excluido de Git mediante .env.*;
la plantilla .env.migrations.example sí se versiona.

src/config/database.migrations.js lee este archivo mediante
dotenv.parse, sin modificar process.env ni las credenciales de
la aplicación. Las rutas relativas de certificados parten de backend.
Las credenciales se administran en MySQL; el código no crea las cuentas.

### Archivos incorporados

| Ubicación dentro de backend | Propósito |
|---|---|
| .env.migrations.example | Plantilla pública de configuración de migraciones. |
| src/config/database.migrations.js | Validación, CA y conexión exclusiva de migraciones. |
| src/config/migrator.js | Configuración de Umzug y su almacenamiento en SequelizeMeta. |
| scripts/migrate.js | Ejecutor de pending, executed, up y down mediante la API de Umzug. |
| migrations/0001-crear-roles.js a 0051-crear-auth-sesiones.js | Una migración por tabla, con funciones up y down. |
| seeders/0001-roles.js | Cuatro roles iniciales. |
| seeders/0002-permisos.js | Doce permisos iniciales. |
| seeders/0003-rol-permisos.js | Asignaciones entre roles y permisos mediante sus IDs reales. |
| seeders/0004-configuracion-global.js | Parámetros EMP_INFO, FINANZAS y HARDWARE. |
| scripts/seed.js | Ejecución ordenada de los cuatro seeds en una transacción. |
| src/models/index.js | Carga, asociaciones y exportación central de los 51 modelos. |

Las migraciones contienen SQL explícito y autónomo, basado en
DOCUMENTACION/BASE DE DATOS/la_veneziana_db_final.sql. Integran los
ALTER posteriores en la estructura inicial de cada tabla y se ordenan
según sus dependencias. No leen el documento SQL al ejecutarse ni
insertan sus seeds automáticamente.

### Comandos de uso

Ejecutar desde backend, después de instalar las dependencias y
completar la configuración privada:

```powershell
# Consultar las migraciones pendientes.
npm.cmd run db:migrate -- pending

# Aplicar todas las pendientes en orden.
npm.cmd run db:migrate -- up

# Consultar el historial de migraciones aplicadas.
npm.cmd run db:migrate -- executed

# Cargar o volver a ejecutar los datos iniciales.
npm.cmd run db:seed
```

npm.cmd run selecciona el script de package.json; el separador --
entrega el argumento siguiente al ejecutor de migraciones.
SequelizeMeta guarda el nombre de cada migración aplicada.
Incluso consultar pending puede crear esta tabla técnica si falta.
El servidor HTTP no ejecuta migraciones ni seeds al arrancar.

El comando de reversión es:

```powershell
npm.cmd run db:migrate -- down
```

Revierte solamente la última migración aplicada. Su función down
elimina la tabla y sus registros; las dependientes deben revertirse
primero. MySQL realiza commits implícitos con DDL: no existe un
rollback transaccional general para la creación o eliminación de tablas.
Ante un fallo de migración, revisar la estructura y el historial antes
de reintentar; una tabla creada podría quedar sin registrar si falla
la escritura posterior en SequelizeMeta.

### Umzug y dependencias

Se utiliza Umzug 3.8.3 mediante su API. Se agregó un override limitado
a umzug -> @rushstack/ts-command-line -> argparse 2.0.1 para retirar
la dependencia indirecta sprintf-js señalada por npm audit.
La auditoría realizada después del ajuste reportó cero vulnerabilidades.
Se conserva el override anterior de uuid bajo Sequelize.

La interfaz de comandos incorporada de Umzug presentó una
incompatibilidad con argparse 2.0.1 (argumento metavar).
Por eso scripts/migrate.js llama directamente a pending(), executed(),
up() y down(); no utiliza runAsCLI(). La API se probó primero en
memoria y después contra MySQL. El resultado de audit no sustituye
las comprobaciones de compatibilidad ni garantiza auditorías futuras.

### Seeds y conservación de datos

Se ejecutaron los seeds repetidamente sin duplicar los registros:

- Cuatro roles de sistema: administrador, cajero, mesero y cocinero.
- Doce permisos y veinte asignaciones: administrador 12, cajero 4,
  cocinero 1 y mesero 3.
- Tres parámetros de configuración: EMP_INFO, FINANZAS y HARDWARE.

Las cláusulas ON DUPLICATE KEY UPDATE conservan los registros que
ya existen. Las asignaciones se agregan sin eliminar permisos previos;
los seeds no sincronizan ni revocan una política de acceso existente.
No dependen de que los IDs empiecen en uno o sean consecutivos.
Los intentos de inserción y las pruebas con rollback pueden dejar
saltos en los identificadores autoincrementales.

Los datos empresariales y la tasa de impuesto quedan pendientes de
completar y validar. Reejecutar el seed conserva los valores que
se hayan configurado. No se crea ningún usuario ni contraseña universal.

### Asociaciones y comprobaciones

Se revisó el registro central: 51 modelos exportados, 436 campos y
160 asociaciones (78 belongsTo, 75 hasMany, 3 hasOne y 4 belongsToMany).
La comparación de los atributos antes y después de registrar las
asociaciones no detectó campos agregados ni cambios en sus tipos,
nulabilidad, claves, valores predeterminados, referencias o setters.

Las relaciones muchos a muchos utilizan RolPermiso y ProductoModificador.
Las relaciones uno a uno corresponden a pedido/venta,
movimiento de caja/gasto y movimiento de Kardex/reserva.
Las asociaciones de navegación por variante en ítems, combos y tareas
usan constraints: false para no agregar una FK simple distinta de la
estructura SQL. Las cuatro claves foráneas compuestas están creadas
y siguen siendo aplicadas por MySQL.

Sequelize no ejecuta sync() ni alter automático. Las consultas relacionadas
deben importar los modelos desde src/models/index.js para cargar las
asociaciones. Los modelos sin claves foráneas, como ConfiguracionGlobal,
EventoOutbox y SerieComprobante, también se exportan desde ese archivo.

Las verificaciones en MySQL devolvieron:

| Elemento | Cantidad |
|---|---:|
| Tablas del sistema, excluyendo SequelizeMeta | 51 |
| Columnas del sistema | 436 |
| Claves foráneas, incluidas cuatro compuestas | 83 |
| Restricciones CHECK | 29 |
| Columnas calculadas | 5 |
| Migraciones registradas | 51 |

Se comprobaron en operaciones reales dentro de transacciones revertidas:

- Rechazo de roles duplicados y asignaciones duplicadas.
- Eliminación en cascada de asignaciones y rechazo de referencias huérfanas.
- Rechazo de stock, reservas y costos negativos, y de reservas superiores al stock.
- Cálculo y recálculo del margen, y rechazo de su asignación manual.
- Rechazo de una variante de otro producto en recetas y de recetas base duplicadas.
- Exclusividad de sesiones abiertas por caja y cajero, liberada al cerrar.
- Exclusividad de cuenta abierta o bloqueada en pago por mesa, liberada al pagar.

También se probaron consultas SELECT con include por bloques y una
consulta de roles con permisos que devolvió las veinte asignaciones
esperadas mediante la cuenta de la aplicación. Las consultas sobre
tablas todavía vacías comprueban la construcción y aceptación del SQL;
no sustituyen pruebas de negocio con registros representativos.
La reversión real completa de las 51 migraciones no se ejecutó;
las funciones up/down se revisaron además mediante ejecución simulada.

### Trabajo pendiente

El inicio de sesión y la firma de JWT se incorporaron en la fase 11,
documentada a continuación.
Siguen pendientes los servicios y validaciones de autorización,
concurrencia, inventario, cobro, devoluciones, emisión fiscal,
publicación de eventos e impresión. Los modelos y asociaciones
no ejecutan estas operaciones automáticamente.

## Login y firma de JWT — fase 11

### Archivos y dependencias

Se instalaron versiones exactas de bcrypt 6.0.0, jsonwebtoken 9.0.3
y express-rate-limit 8.7.1, registradas en package.json y package-lock.json.
La auditoría posterior a la instalación reportó cero vulnerabilidades.

| Archivo dentro de backend | Responsabilidad |
|---|---|
| src/security/password.js | Crear hashes bcrypt y verificar contraseñas sin recortar sus espacios. |
| src/security/token.js | Configurar y firmar tokens de acceso. |
| src/validators/login.js | Validar el cuerpo, correo y longitud de contraseña antes de consultar MySQL. |
| src/services/auth.service.js | Verificar credenciales, estado y bloqueo; actualizar intentos y resolver rol y permisos. |
| src/middlewares/loginLimiter.js | Limitar solicitudes de login por IP y responder HTTP 429. |
| src/controllers/auth.controller.js | Convertir los resultados del servicio en respuestas HTTP. |
| src/routes/auth.routes.js | Registrar POST /login con el limitador antes del controlador. |
| src/app.js | Montar el router en /api/auth, antes del manejador 404. |
| scripts/helpers/terminal.js | Solicitar datos visibles y contraseñas ocultas en una terminal interactiva. |
| scripts/crear-admin.js | Crear el primer administrador con confirmación de contraseña y sin sobrescribir cuentas. |

### Endpoint y respuestas

Iniciar el backend desde su carpeta con npm.cmd run dev o npm.cmd start.
El destino local es POST http://127.0.0.1:3000/api/auth/login.
Enviar Content-Type: application/json y un objeto con email y password.

| HTTP | Significado |
|---|---|
| 200 | Acceso correcto: mensaje, token, expiraEn y usuario. |
| 400 | Formato de datos inválido; también puede proceder del parser JSON. |
| 401 | Cuenta inexistente, contraseña incorrecta, estado inactivo o bloqueo vigente, con el mismo mensaje general. |
| 429 | Se superó el límite de solicitudes por IP. |
| 500 | Error interno con mensaje general y sin detalles del fallo en la respuesta. |

La respuesta de usuario contiene únicamente id, nombre, email, rol y
permisos. No incluye password_hash, hashes de PIN ni el modelo completo.
El controlador y la respuesta del limitador usan Cache-Control: no-store.
El manejador central conserva las respuestas generales de errores;
Pino registra los metadatos HTTP sin cuerpos ni encabezados de sesión.
En respuestas 500, pino-http puede añadir su error genérico y stack interno.

### Contraseñas y tokens

Las contraseñas nuevas requieren al menos 12 caracteres y un máximo
de 72 bytes UTF-8. bcrypt utiliza costo 12 y sal aleatoria.
La verificación de login acepta una cadena no vacía de hasta 72 bytes;
no recorta ni transforma la contraseña. El correo se recorta en sus
extremos y se comprueba con un formato básico y longitud máxima de 100.

El token se firma con HS256, emisor la-veneziana-backend,
audiencia la-veneziana-pos y duración de 900 segundos (15 minutos).
JWT_SECRET sigue siendo el secreto privado validado de .env;
token.js lo interpreta como bytes hexadecimales. Los claims son
sub (ID del usuario como cadena), iss, aud, iat, exp y jti aleatorio.
El JWT no incluye roles, permisos, contraseñas ni hashes. Su firma
no cifra el contenido ni sustituye la verificación posterior del token.

### Intentos, bloqueos y límite HTTP

El servicio solo acepta usuarios con estado activo. Usa una transacción
y SELECT FOR UPDATE sobre la fila del usuario para serializar los
cambios del contador. Tras cinco contraseñas incorrectas se establece
un bloqueo de 15 minutos. Durante ese bloqueo tampoco se acepta una
contraseña correcta. Al vencer, el siguiente fallo inicia otro contador;
un acceso correcto limpia intentos y bloqueo y registra ultimo_acceso.

Los rechazos se devuelven normalmente desde la transacción para que
se confirmen los intentos fallidos. Los errores internos sí provocan
rollback. Las cuentas inexistentes también realizan una comparación
bcrypt con un hash simulado, para reducir diferencias de trabajo;
esto no garantiza tiempos de respuesta idénticos.

El limitador admite 20 solicitudes de login por IP en 15 minutos,
contando éxitos y fallos que llegan a la ruta. Incluye encabezados
RateLimit y Retry-After cuando corresponde. El contador es local al
proceso y se pierde al reiniciarlo; varias instancias requerirán un
almacenamiento compartido. La configuración actual corresponde a
conexión directa; cualquier proxy debe configurarse explícitamente.
El límite del login no bloquea /health.

### Alta inicial del administrador

Después de aplicar migraciones, seeds y completar el .env de la
aplicación, ejecutar desde backend en una terminal interactiva:

```powershell
node scripts/crear-admin.js
```

El comando solicita nombre, correo, contraseña y confirmación.
La entrada de contraseña no muestra letras ni asteriscos y el historial
de readline está desactivado. No se reciben contraseñas mediante
argumentos del comando ni se utiliza una contraseña universal.
Ctrl+C permite cancelar durante las preguntas.

El rol administrador debe existir. Se comprueba que no haya un
usuario con ese rol, incluso si está inactivo. La comprobación se
repite dentro de una transacción, bloqueando el rol para serializar
ejecuciones simultáneas de este comando. Un correo ya registrado
se rechaza; las cuentas existentes no se actualizan ni se borran.
Se creó la cuenta inicial y se verificaron su rol administrador,
estado activo, cero intentos fallidos y bloqueo NULL.

El comando es un mecanismo de arranque local, no una ruta pública
de registro ni una herramienta de recuperación de contraseña.
La contraseña real no debe incluirse en ejemplos, capturas o archivos
versionados. Las cuentas de la aplicación y de migraciones de MySQL
son distintas de los usuarios que se registran en la tabla usuarios.

### Comprobaciones realizadas

Las pruebas se ejecutaron manualmente desde PowerShell y Node.js:

- Hashes distintos para la misma contraseña, costo 12, comparación
  correcta y rechazo de valores cortos o superiores a 72 bytes.
- Prueba Unicode con escape \u00e9 para evitar cambios de codificación
  al enviar scripts desde PowerShell a Node.js.
- Firma y claims del JWT, tokens distintos para el mismo usuario,
  rechazo con otra clave y vencimiento simulado sin esperar 15 minutos.
- Validación de objetos, correo, tipos y conservación de espacios de clave.
- Persistencia de cinco intentos, bloqueo, recuperación tras vencer,
  reinicio del contador y actualización del último acceso.
- Rechazo de usuarios suspendidos y cesados; rol y cuatro permisos
  del cajero comprobados con una cuenta temporal.
- Tres intentos concurrentes conservaron el contador correcto.
- Limitador aislado: veinte solicitudes aceptadas y la 21 rechazada.
- Endpoint completo: HTTP 400, 401, 200 y 429; JWT verificado,
  datos sensibles excluidos y /health disponible tras alcanzar el límite.
- Fallo interno inyectado temporalmente: HTTP 500 general, sin el
  detalle privado en la respuesta, y servidor todavía disponible.
- Terminal con entrada oculta y creación real del administrador inicial.

Los usuarios temporales se eliminaron al terminar y los servidores
temporales se cerraron. La prueba del servicio confirma sus propias
transacciones; no se revierte mediante una transacción externa.
El fallo inyectado se restauró al finalizar. La cuenta real del
administrador permanece guardada. Estas comprobaciones manuales no
constituyen una suite automatizada ni una auditoría completa de seguridad.

### Alcance pendiente

Al terminar la fase 11, el login devuelve el token en JSON. Todavía no verifica tokens en
rutas protegidas, no aplica autorización por permisos y no registra
sesiones en auth_sesiones ni implementa revocación o renovación.
La fase 12 incorporará la protección del backend. La integración
de sesión del frontend se realizará con el mecanismo previsto en
el plan: cookies HttpOnly/Secure y protección CSRF cuando corresponda,
sin guardar credenciales de sesión en localStorage.

Quedan pendientes el frontend de login, la gestión de usuarios,
la recuperación de acceso y los servicios operativos del negocio.

## Fase 12: autenticación, autorización y gestión de seguridad

Esta sección describe el transporte Bearer al cerrar la fase 12;
la fase 14 lo reemplaza por cookies, según se documenta más adelante.

Los pendientes de protección de rutas, gestión de usuarios y recuperación
administrativa descritos al cerrar la fase 11 se implementaron en esta fase.

### Sesiones y permisos

El login registra la sesión en `auth_sesiones` dentro de su transacción.
El JWT y la sesión comparten usuario, identificador y vencimiento.
`verificarTokenAcceso` comprueba firma HS256, emisor, audiencia,
vencimiento y formato de los claims, con una duración máxima de 15 minutos.

`autenticar` exige un encabezado `Authorization: Bearer <token>`, una
sesión vigente sin revocar y un usuario activo. Consulta el rol y los
permisos actuales en MySQL. Los rechazos de autenticación devuelven
HTTP 401; un fallo interno de la base se deriva al manejador HTTP 500.
`exigirPermiso` comprueba módulo y acción y devuelve HTTP 403 si faltan.
No existe un acceso automático por llamarse administrador.

### Rutas disponibles

| Método y ruta | Función |
| --- | --- |
| POST /api/auth/login | Iniciar sesión y registrar su identificador. |
| GET /api/auth/session | Consultar identidad y permisos vigentes. |
| POST /api/auth/logout | Revocar exclusivamente la sesión presentada; HTTP 204. |
| GET /api/usuarios | Listar empleados con paginación y campos públicos. |
| POST /api/usuarios | Crear un empleado activo con contraseña hasheada y rol existente. |
| PATCH /api/usuarios/:id/estado | Activar, suspender o cesar un empleado. |
| PATCH /api/usuarios/:id/rol | Cambiar el rol asignado. |
| POST /api/usuarios/:id/restablecer-password | Establecer una contraseña nueva; HTTP 204. |
| POST /api/usuarios/:id/revocar-sesiones | Revocar todas sus sesiones existentes; HTTP 204. |
| GET /api/roles | Consultar roles y sus permisos. |
| GET /api/roles/permisos | Consultar el catálogo de permisos. |
| PUT /api/roles/:id/permisos | Reemplazar la lista completa de permisos de un rol. |
| POST /api/autorizaciones | Emitir una autorización para una acción y un recurso concretos. |

Las rutas de usuarios, roles y autorizaciones requieren autenticación y
`seguridad/gestionar`. La emisión de autorizaciones comprueba además los
permisos de la acción concreta. Las respuestas de `/api` llevan
`Cache-Control: no-store`, incluidos los errores al interpretar JSON.

### Gestión de empleados y roles

Los validadores aceptan únicamente los campos previstos. El alta exige
una contraseña de al menos 12 caracteres y un máximo de 72 bytes UTF-8;
conserva sus espacios. El correo duplicado devuelve HTTP 409.
El listado admite páginas de 1 a 10000 y límites de 1 a 50, con 20 por defecto.
Las respuestas públicas excluyen contraseñas, hashes y PIN.

Suspender o cesar revoca las sesiones en la misma transacción.
Reactivar no restaura sesiones anteriores. Cambiar el rol o su lista de
permisos también revoca las sesiones afectadas; enviar el mismo valor
conserva las sesiones. Una lista vacía retira los permisos del rol.

El operador no puede cambiar su propio estado o rol ni restablecer su
propia contraseña mediante estas operaciones administrativas. Se protege
al último administrador activo y se coordinan los cambios mediante
bloqueos. La asignación de permisos protege al rol administrador y al rol
del operador. El restablecimiento reinicia intentos y bloqueo temporal,
conserva estado y rol y revoca todas las sesiones anteriores.

### Autorizaciones sensibles

`politicasAutorizacion.js` habilita `inventario/ajustar` sobre
`insumos_almacen` y `ventas/devolver` sobre `ventas_comprobantes`.
La aprobación registra actor, aprobador, acción, entidad, identificador,
motivo y vencimiento a cinco minutos. El aprobador procede de la sesión;
debe tener gestión de seguridad y permiso para la acción. El actor debe
estar activo y disponer también del permiso correspondiente.

`consumirAutorizacion` exige una transacción activa del servicio que
ejecutará la operación. Comprueba alcance, vencimiento, consumo previo,
existencia del recurso y estado y permisos actuales de actor y aprobador.
El bloqueo y la actualización condicional impiden consumos duplicados.
Un fallo de la operación debe propagarse para revertir también el consumo.
No hay una ruta HTTP independiente para consumir aprobaciones.

### Archivos y comprobaciones

Se añadieron los middlewares `autenticar.js` y `exigirPermiso.js`, los
controladores, rutas y servicios de usuarios, roles y autorizaciones,
sus validadores y `security/politicasAutorizacion.js`. Se actualizaron
`app.js`, el servicio y controlador de autenticación, sus rutas y `token.js`.

Las pruebas manuales con servidores y registros temporales comprobaron
HTTP 400, 401, 403, 404, 409 y respuestas correctas; sesiones ausentes,
vencidas o revocadas; estados de empleados; paginación; alta y correo
duplicado; cambios de rol y permisos; restablecimiento y revocación.
Se verificaron los permisos del nuevo login y la conservación de sesiones
no afectadas. Las pruebas de autorizaciones comprobaron alcance, vigencia,
uso único, permisos retirados, aprobador suspendido, reversión conjunta y
dos consumos simultáneos con un único resultado aceptado.
Los registros temporales se eliminaron al finalizar.

### Integraciones pendientes

Las aprobaciones todavía no ejecutan ajustes ni devoluciones: esos
servicios deberán consumirlas junto con su operación en una transacción.
Los bloqueos implementados para proteger al último administrador requieren
mantener la misma coordinación en futuras operaciones de seguridad.
Las pruebas manuales no constituyen una auditoría completa ni una suite
automatizada; no se desactivaron administradores reales para probar ese límite.

Al cerrar la fase 12 quedaban pendientes el frontend de login, las cookies HttpOnly/Secure y
la protección CSRF cuando corresponda. El transporte actual usa Bearer;
no guardar credenciales de sesión en localStorage. No se implementaron
tokens de renovación. La integración de auditoría de operaciones de
seguridad y los servicios del negocio se desarrollarán por separado.

## Fase 13: interfaz de login

Se sustituyó la pantalla inicial por el acceso del personal. El diseño
final utiliza el logo original a la izquierda y el formulario a la derecha
en escritorio. En pantallas pequeñas se organizan en una columna.
Se mantuvo el fondo oscuro y, por preferencia del usuario, la tarjeta
blanca prevista inicialmente se reemplazó por vidrio translúcido.

### Archivos creados y modificados

| Archivo relativo a frontend | Responsabilidad |
| --- | --- |
| src/pages/Login.jsx (nuevo) | Pantalla, campos de correo y contraseña y control de visibilidad. |
| src/assets/logo-veneziana.png (nuevo) | Copia del PNG original de DOCUMENTACION; conserva proporción y transparencia. |
| public/licenses/playfair-display-LICENSE.txt (nuevo) | Copia de la licencia OFL-1.1 de la fuente incorporada. |
| src/App.jsx | Muestra Login y conserva el enlace para saltar al contenido. |
| src/main.jsx | Importa Playfair Display desde el paquete local. |
| src/theme.css | Añade font-marca con Playfair Display y fuentes de respaldo. |
| src/index.css | Define el vidrio, fondo, foco y efectos exclusivos del login. |
| package.json y package-lock.json | Registran @fontsource-variable/playfair-display 5.3.0 exacto. |

El README general también se actualizó. El componente se importa con el
nombre exacto `Login.jsx`, respetando mayúsculas y minúsculas.

### Formulario y accesibilidad

`Login` utiliza `useId` para asociar etiquetas y campos y `useState` para
mostrar u ocultar la contraseña sin alterar su contenido. Los campos
incluyen autocompletado, tipos y atributos requeridos; el correo admite
hasta 100 caracteres. No se impone en el login la longitud mínima de alta,
para permitir la comparación con credenciales existentes en el backend.

El botón Mostrar/Ocultar conserva su estado accesible. Los iconos
decorativos no se anuncian a lectores de pantalla. Se mantiene el foco
visible en dorado y el enlace Saltar al contenido. El texto de recuperación
remite al administrador y no simula un procedimiento de recuperación.

### Diseño y efectos

El logo mantiene su proporción. La marca utiliza Playfair Display y el
resto de la interfaz conserva Inter. Se añadieron fondo con luces suaves,
trama discreta, separación visual entre columnas y vidrio con respaldo
oscuro cuando el navegador no dispone de desenfoque.

La entrada del logo y formulario es breve y escalonada. El halo del logo
se reproduce una vez; los bordes y los iconos responden al foco. El botón
incorpora destello, elevación y desplazamiento leve de su flecha.
`moverLuz` actualiza variables CSS para seguir el ratón sin renderizados
de React por movimiento. La luz interactiva se omite en dispositivos
táctiles y con preferencia de movimiento reducido; esa preferencia también
desactiva las animaciones y transiciones decorativas. No hay animaciones
continuas automáticas ni librerías de efectos adicionales.

### Comprobaciones y alcance

ESLint y la compilación de producción finalizaron correctamente.
La instalación de la fuente reportó cero vulnerabilidades en npm audit.
Se revisaron visualmente escritorio y móvil, incluido un ancho de 320 px
sin desbordamiento horizontal, y se comprobó el cambio de tipo password/text
del control de visibilidad y la actualización de la luz con el ratón.

Esta fase entrega la interfaz. `manejarEnvio` evita la navegación y el envío
de credenciales por la URL; todavía no realiza solicitudes al backend ni
simula un acceso correcto. La fase 14 conectará el formulario con la sesión
y la identidad visual, con cookies HttpOnly/Secure y protección CSRF cuando
corresponda. No guardar credenciales de sesión en localStorage.

## Fase 14: sesión con cookies y Zustand

Se conectó el formulario al backend y se comprobó en el navegador el ciclo
de ingreso, recuperación de sesión al recargar, cierre y recarga sin sesión.

### Backend y cookies

`security/cookies.js` define establecerCookieSesion y borrarCookieSesion.
La cookie es `veneziana_sesion` en desarrollo y `__Host-veneziana_sesion`
en producción. Lleva HttpOnly, SameSite=Lax, ruta raíz y ningún Domain;
Secure se activa en producción, que requiere HTTPS. Su vencimiento coincide
con el del JWT y no prolonga la sesión.

Login emite la cookie y devuelve mensaje, expiraEn e identidad, sin JWT
en JSON. `autenticar` lee req.cookies y mantiene las verificaciones de JWT,
sesión en MySQL, usuario activo y permisos. Un rechazo 401 retira la cookie.
Logout revoca la sesión antes de borrarla. Bearer ya no autentica.
Se instaló cookie-parser 1.4.7 exacto y se habilitaron credenciales CORS
para el origen configurado.

`middlewares/protegerCsrf.js` exige Origin igual a CORS_ORIGIN y
`X-CSRF-Protection: 1` para las solicitudes que modifican datos, incluidos
login y logout. Si faltan o son incorrectos responde 403. GET, HEAD y OPTIONS
quedan exentos y no deben modificar datos. Es una defensa de encabezado
personalizado y origen estricto, no un token secreto. Las pruebas y clientes
HTTP de las fases anteriores necesitan actualizar esos encabezados.

### Cliente y estado de sesión

Se instaló Zustand 5.0.15 exacto. Los nuevos archivos del frontend son:

| Archivo | Funciones y responsabilidad |
| --- | --- |
| src/services/api.js | solicitarApi envía cookies, CSRF y JSON sin caché; ErrorApi distingue rechazos HTTP y fallos de red. Admite 204 y cancelación. |
| src/services/auth.service.js | iniciarSesion, obtenerSesion y cerrarSesion llaman a las rutas del backend; solo se recorta el correo. |
| src/stores/auth.store.js | comprobarSesion recupera la identidad, ingresar autentica y salir confirma el cierre. Conserva usuario, estado, operación y error en memoria. |

Los estados son comprobando, autenticado, sin_sesion y error. La consulta
inicial se comparte para evitar duplicados por StrictMode. Un 401 inicial
significa ausencia de sesión; los fallos de conexión permiten reintentar.
Si el cierre falla por red o error interno se conserva la identidad y se
informa el problema. No se guardan contraseñas, cookies ni JWT en el store.

`App.jsx` consulta la sesión al montar y muestra carga, reintento, login o
identidad y cierre. `Login.jsx` envía credenciales, bloquea los controles
durante el envío, muestra Ingresando y errores accesibles y retira la clave
tras un rechazo, conservando el diseño. `main.jsx` carga App de forma
diferida para capturar errores de configuración de los servicios al iniciar.

### Preparación local y archivos modificados

Usar VITE_API_URL=/api y abrir http://localhost:5173. El proxy de Vite
reenvía /api a http://127.0.0.1:3000; el backend debe estar activo y su
CORS_ORIGIN debe coincidir con el origen del frontend. Reiniciar Vite al
cambiar la configuración. La plantilla pública se actualizó y el .env real
sigue privado. En producción se debe publicar /api bajo el mismo origen
con HTTPS: el proxy de Vite solo funciona durante el desarrollo.

Se modificaron los manifiestos y locks de ambos proyectos, app.js,
auth.controller.js, autenticar.js, App.jsx, Login.jsx, main.jsx,
vite.config.js, la plantilla de desarrollo y los README. Se añadieron
cookies.js, protegerCsrf.js y los tres archivos de servicios/store indicados.
No se añadieron tablas ni migraciones.

### Comprobaciones y pendientes

Las instalaciones reportaron cero vulnerabilidades en npm audit.
ESLint y la compilación del frontend pasaron sin avisos tras ajustar el
arranque. Las pruebas HTTP con usuario temporal verificaron atributos y
vencimiento de cookie, JWT excluido del JSON, dos sesiones independientes,
logout selectivo y rechazo con retirada de cookies inválidas, sesiones
vencidas y usuarios suspendidos. CSRF bloqueó mutaciones sin origen o
encabezado correctos; preflight y CORS con credenciales funcionaron.
Los registros temporales se eliminaron al terminar. El usuario confirmó
el ciclo completo de ingreso, recarga, cierre y recarga desde el navegador.

La vista autenticada confirma identidad y rol. Los guards de React Router
corresponden a la fase 15 y las pantallas del negocio a fases posteriores.
No se implementaron tokens de renovación ni persistencia de credenciales
en el navegador. Las pruebas locales no validan un despliegue HTTPS de
producción.

## Fase 15: navegación y rutas protegidas

Se instaló react-router-dom 7.18.4 con versión exacta. BrowserRouter
envuelve App dentro de StrictMode, conservando la carga diferida y el
manejo de errores del arranque. No se cambió la autenticación del backend.

### Rutas y comportamiento

| Ruta | Acceso y resultado |
| --- | --- |
| / | Redirige a /inicio. |
| /login | Muestra el formulario sin sesión; con identidad válida vuelve al destino interno solicitado o a /inicio. |
| /inicio | Exige sesión y muestra identidad, rol y cierre de sesión. |
| /seguridad | Exige sesión y seguridad/gestionar; consulta los roles del backend. |
| Cualquier ruta desconocida | Muestra Página no encontrada y un enlace al inicio. |

App espera GET /api/auth/session antes de resolver la navegación inicial.
ProtectedRoute también trata los estados comprobando y error: no muestra
contenido protegido mientras se espera y permite reintentar ante fallos
de conexión. Sin una identidad válida, redirige a /login mediante replace
y conserva pathname, búsqueda y fragmento como destino de regreso.

El destino del login se limita a rutas internas. Se rechazan destinos
externos, barras inversas, espacios, caracteres de control y el retorno
al propio /login para evitar redirecciones inseguras o bucles. El parser
de URL normaliza el destino antes de utilizarlo.

Un guard con módulo o acción configurados exige ambos valores y una
coincidencia exacta en los permisos del usuario; una configuración
incompleta deniega acceso. No hay excepciones por nombre de rol.
Si faltan permisos se muestra Acceso restringido sin montar la página
hija. Volver al inicio conserva la sesión del usuario.

### Archivos y funciones

| Archivo relativo a frontend | Responsabilidad |
| --- | --- |
| src/routes/ProtectedRoute.jsx (nuevo) | ProtectedRoute comprueba sesión y permisos, conserva el destino del login y renderiza la ruta hija mediante Outlet solo cuando está autorizada. |
| src/pages/Inicio.jsx (nuevo) | Inicio separa la vista autenticada de App y conserva identidad, rol, mensajes y cierre mediante Zustand. |
| src/pages/Seguridad.jsx (nuevo) | Seguridad consulta GET /api/roles mediante cargarRoles y muestra nombre, descripción y cantidad de permisos. Es de solo lectura. |
| src/App.jsx | Define Routes y Route; RutaLogin evita mostrar el formulario con sesión activa; obtenerDestinoLogin valida el retorno interno. Incluye inicio, seguridad y página no encontrada. |
| src/main.jsx | Habilita BrowserRouter sin retirar StrictMode ni el manejo de errores iniciales. |
| package.json y package-lock.json | Registran la dependencia de navegación y su resolución exacta. |

Se actualizaron también este README y frontend/README.md. La consulta de
roles se cancela al desmontar Seguridad o al repetir el efecto en StrictMode.
Un 401 vuelve a comprobar la sesión global; otros errores se muestran sin
datos de roles. El guard utiliza la identidad en memoria; el backend vuelve
a autorizar cada solicitud con los permisos actuales de MySQL.

### Comprobaciones y cierre funcional

La instalación reportó cero vulnerabilidades en npm audit. ESLint y la
compilación de producción pasaron. Se corrigieron el import de BrowserRouter
sin uso y la validación de caracteres de control que ESLint rechazaba.
También se comprobó el bloque de /seguridad tras sincronizar el archivo
guardado con la pestaña del editor.

El usuario verificó en el navegador el acceso de administrador a /seguridad,
con los cuatro roles y sus cantidades de permisos. Una cuenta temporal de
cajero recibió Acceso restringido y pudo volver al inicio con su sesión
activa. El usuario confirmó la ejecución de la limpieza limitada a esa
cuenta y sus sesiones; el administrador real se conservó.

La protección visual no reemplaza los controles HTTP del backend. Las
pantallas del negocio y los layouts generales se desarrollarán después.
En producción, el alojamiento deberá resolver rutas del frontend mediante
index.html sin interceptar /api; BrowserRouter necesita esa configuración
para abrir direcciones internas directamente.

## Fase 16: componentes visuales compartidos

Se añadieron componentes puros para estandarizar botones y etiquetas.
Reciben propiedades y delegan las operaciones a la pantalla que los usa;
no consultan la API ni guardan credenciales. No se instalaron dependencias.

### Archivos y responsabilidades

| Archivo relativo a frontend | Función |
| --- | --- |
| src/components/ui/BotonBase.jsx (nuevo) | BotonBase concentra tipo, bloqueo, carga, texto pendiente y estilos comunes de interacción. |
| src/components/ui/BotonSecundario.jsx (nuevo) | Botón dorado con texto oscuro que reutiliza BotonBase. |
| src/components/ui/BotonPeligro.jsx (nuevo) | Botón rojo oscuro con texto blanco para acciones destructivas; reutiliza BotonBase. |
| src/components/ui/Badge.jsx (nuevo) | Etiqueta con variantes neutro, exito, advertencia y peligro; variante desconocida usa neutro. |
| src/pages/Componentes.jsx (nuevo) | Galería de desarrollo con botones, etiquetas y controles locales para simular carga y deshabilitado. |
| src/pages/Inicio.jsx | Reutiliza el botón dorado para logout y Badge para sesión activa y rol. |
| src/App.jsx | Registra /componentes únicamente con import.meta.env.DEV, bajo seguridad/gestionar. |

Se actualizaron también este README y frontend/README.md. Los componentes
residen juntos en components/ui y utilizan imports relativos entre ellos.

### Comportamiento y accesibilidad

BotonBase usa type=button por defecto para evitar envíos accidentales.
Admite disabled, cargando y textoCargando, además de propiedades nativas
como onClick y atributos accesibles. Mientras está cargando se deshabilita,
expone aria-busy y muestra un texto de operación pendiente. La lógica de
negocio y las confirmaciones pertenecen a la pantalla, no al componente.

Los botones tienen una altura mínima de 44 px, foco visible heredado,
elevación breve al pasar el ratón y escala leve al pulsar. La interacción
animada se aplica solo a botones habilitados y respeta movimiento reducido.
Los colores de las variantes se mantienen como clases estáticas para que
Tailwind los incluya. Dorado utiliza texto oscuro; peligro utiliza un rojo
más oscuro con texto blanco. Badge comunica el estado mediante texto y color
y no incorpora animaciones ni controles interactivos.

### Integración y comprobaciones

Inicio conserva el cierre de sesión mediante Zustand; el componente recibe
el estado de logout y muestra Cerrando sesión sin permitir pulsaciones
repetidas. Las etiquetas presentan Sesión activa y el rol del usuario.

La galería /componentes requiere sesión y seguridad/gestionar, y solo
existe en desarrollo. Sus botones cambian un mensaje local: no ejecutan
operaciones destructivas ni modifican datos del sistema. Las casillas
permiten activar carga y deshabilitado de forma independiente.

ESLint y la compilación de producción pasaron. Se comprobó visualmente
la integración en Inicio y la galería con las cuatro variantes de Badge.
El usuario confirmó las pulsaciones de ambos botones, el cambio de mensaje,
el bloqueo durante carga y deshabilitado y la activación con Tab y Enter.
Se corrigió el import de Componentes sin uso al registrar su ruta.

### Temas y siguientes fases

El proyecto contempla modo claro para administración, caja e inventario,
y modo oscuro para cocina y perfiles que lo habiliten. Todavía no existe
un selector global de tema; el login conserva su presentación oscura propia.
La base de selección claro/oscuro y su preferencia visual se preparará con
los layouts de la fase 17. La preferencia de apariencia puede persistirse
sin almacenar credenciales de sesión. Las siguientes pantallas reutilizarán
estos componentes conforme se implementen sus operaciones reales.

## Fase 17: layouts y selección de tema

Se incorporaron dos estructuras de navegación y el modo claro/oscuro.
No se añadieron dependencias ni se modificó el backend o la base de datos.

### Archivos y funciones

| Archivo relativo a frontend | Responsabilidad |
| --- | --- |
| src/stores/tema.store.js (nuevo) | useTemaStore mantiene la apariencia; leerTemaGuardado recupera una preferencia válida o usa claro; aplicarTema actualiza data-tema y colorScheme; inicializarTema, cambiarTema y alternarTema controlan su aplicación. |
| src/components/SelectorTema.jsx (nuevo) | Ofrece el cambio de tema con icono decorativo y nombre accesible que identifica la siguiente apariencia. |
| src/layouts/AdminLayout.jsx (nuevo) | Cabecera con identidad y logout, menú lateral con ruta activa dorada, enlaces según permisos y Outlet para las páginas. manejarTeclado cierra el menú móvil con Escape y devuelve el foco al botón. |
| src/layouts/PosLayout.jsx (histórico) | Cabecera del POS con usuario, rol, selector y logout sin menú lateral. Reemplazado por AdminLayout para mantener la barra lateral. |
| src/pages/PuntoVenta.jsx | Terminal operativo del POS con catálogo visual, personalización en modal y recibo térmico financiero en tiempo real. |
| src/theme.css | Variables app-* para fondos, superficies, texto, bordes, errores y foco en ambos temas, vinculadas a utilidades de Tailwind. |
| src/main.jsx | Aplica la preferencia antes de montar React y conserva la carga diferida de App y su manejo de errores. |
| src/App.jsx | Integra las rutas protegidas bajo AdminLayout para /inicio, /catalogo, /clientes, /inventario y /pos con ventas/cobrar. |
| src/pages/Inicio.jsx, Seguridad.jsx y Componentes.jsx | Secciones adaptadas al layout y a los colores del tema; el main y el cierre de sesión se centralizan en el layout. Seguridad conserva su consulta y añade estado vacío y singular de permiso. |

### Navegación, apariencia y alcance

Inicio requiere sesión. Seguridad y la galería requieren seguridad/gestionar;
la galería continúa disponible solo en desarrollo. El POS y su enlace de menú
requieren ventas/cobrar. Ocultar enlaces no sustituye la protección de rutas
ni los controles del backend para las futuras operaciones.

La clave localStorage la-veneziana-tema almacena solo claro u oscuro. Si el
almacenamiento falla, el cambio sigue disponible durante la visita. No se
persisten credenciales ni identidad en este almacén. El login conserva su
presentación oscura propia y los botones dorados mantienen texto oscuro.

El menú móvil usa aria-expanded y aria-controls; cierra al elegir un enlace
o con Escape. NavLink identifica la ruta actual y cada layout aporta un main
con el destino del enlace Saltar al contenido. Los errores de logout se muestran
sin retirar la identidad cuando el servidor no confirma el cierre.

### Validación

ESLint y la compilación de producción pasaron al cerrar la fase. Las capturas
aportadas por el usuario muestran administración en claro y oscuro y el POS
en oscuro; confirmó las revisiones de tema persistente, disposición móvil y
menú antes de incorporar el acceso al POS. La estructura de productos y carrito
es preparatoria: las operaciones de venta siguen pendientes.

## Fase 18: tabla de datos reutilizable

Se creó DataTable para presentar registros con filas alternadas, resaltado
al pasar el ratón y colores adaptables a claro/oscuro. Utiliza Inter y
tabular-nums en las columnas numéricas. No se añadieron dependencias ni se
modificaron el backend o la base de datos.

### Archivos y funciones

| Archivo relativo a frontend | Responsabilidad |
| --- | --- |
| src/components/ui/DataTable.jsx (nuevo) | DataTable muestra columnas y filas recibidas, estados de carga, error y vacío, y contenido personalizado por celda. obtenerAlineacion selecciona izquierda, centro o derecha. useId vincula el título con la región desplazable. |
| src/pages/Componentes.jsx | Integra una demostración con cuatro registros ficticios, cantidades y precios en soles. estadoTabla y setEstadoTabla controlan el selector de registros, carga, vacío y error. formatoMoneda utiliza Intl.NumberFormat de es-PE; columnasEjemplo configura alineación y formato. |

### Uso y alcance

La tabla recibe titulo, columnas y filas. Cada columna tiene clave y titulo;
puede definir alineacion, numerica y renderizar(fila). Las claves de columna
deben ser únicas y debe proporcionarse al menos una columna. Cada fila utiliza
su id como clave, o el resultado único y estable de obtenerClave(fila).
Los valores null o undefined se presentan como un guion; el cero se conserva.

cargando, error y mensajeVacio controlan los estados. Mientras carga o existe
un error, no se muestran filas anteriores. La tabla utiliza caption y cabeceras
con scope=col; el contenedor tiene nombre accesible, admite foco por teclado y
limita el desplazamiento horizontal a su región. Los mensajes usan status o
alert y aria-busy identifica la espera.

El componente presenta los datos recibidos: todavía no incorpora paginación,
ordenación, filtros, virtualización ni exportación a Excel. Las futuras páginas
deberán gestionar las consultas y limitar los registros que entregan a la tabla.
La demostración permanece en /componentes, solo en desarrollo y protegida por
seguridad/gestionar; no consulta la API ni modifica datos del negocio.

### Comprobaciones

ESLint y build pasaron al cierre. Se corrigieron los cinco avisos de variables
sin uso al insertar el bloque JSX de la demostración. La captura del usuario
permite verificar filas alternadas en oscuro, precios en soles alineados a la
derecha y cantidad cero visible. La galería permite revisar también carga,
vacío, error, tema claro, hover y presentación en una ventana pequeña.

## Fase 19: API de catálogo y soporte de clientes

Se añadieron validadores, servicios, controladores y rutas para categorías,
productos, variantes, grupos de modificadores, opciones y asignación de grupos
a productos. Se utilizan las tablas existentes, sin DDL ni nuevas dependencias.
Las rutas administrativas de catálogo exigen sesión y catalogo/gestionar;
las escrituras conservan la protección CSRF global.
Los archivos, funciones y contrato HTTP se detallan en
[backend/CATALOGO.md](backend/CATALOGO.md).

| Recurso bajo /api | Operaciones |
| --- | --- |
| /categorias | GET paginado, POST y PATCH /:id; activa permite desactivar. |
| /productos | GET paginado, POST y PATCH /:id; estado permite inactivar. |
| /productos/:productoId/variantes | GET paginado, POST y PATCH /:varianteId. |
| /modificadores | GET paginado, POST y PATCH /:grupoId. |
| /modificadores/:grupoId/items | GET paginado, POST y PATCH /:itemId. |
| /productos/:productoId/modificadores | GET paginado; PUT /:grupoId asigna y DELETE /:grupoId retira solo el vínculo. |

Paginación de catálogo: pagina 1 y limite 20 por defecto; máximos 10000 y 50.
Los precios DECIMAL(12,2) no negativos se normalizan como cadenas sin redondear
entradas con más de dos decimales. Los campos calculados, costos y stock no se
aceptan en la escritura del catálogo. Las respuestas seleccionan sus campos.
Productos activos requieren categoría activa; los productos directos necesitan
insumo, activo cuando el producto lo está. Platos preparados y combos no usan
insumo directo ni control directo de stock. Las actualizaciones comprueban
la configuración combinada con el registro actual.

Las restricciones únicas protegen slug, SKU y código de barras. Variantes y
opciones comprueban nombre por propietario bajo bloqueo. Las rutas hijas
validan pertenencia; asignación y retirada de grupos son repetibles y no borran
opciones ni otros productos. Las escrituras utilizan transacciones.

El CRM añade búsqueda exacta obligatoria por documento o teléfono, paginación,
perfil limitado, actividad calculada con ventas y direcciones por cliente.
Se separan clientes/buscar y el nuevo clientes/gestionar, asignado inicialmente
solo al administrador. El comando idempotente npm.cmd run crm:habilitar ya se
ejecutó en esta instalación; los seeds también reflejan la separación.
Los datos, rutas, permisos y funciones se detallan en [backend/CRM.md](backend/CRM.md).

Se verificaron sintaxis, imports y HTTP/MySQL: permisos, CSRF, paginación,
validaciones, duplicados y altas concurrentes, relaciones, vínculos repetibles,
perfil sin padrón completo, documentos únicos, direcciones preferidas bajo
concurrencia, segmentos con ventas y límite 429. Se corrigió la serialización
de productos y el nombre del archivo de rutas de opciones. Todos los datos
temporales se eliminaron. Las interfaces administrativas corresponden a fase 20.

## Fase 20: administración de catálogo y clientes

El frontend incorpora `/catalogo` y `/clientes` con el estilo compartido de
La Veneziana, modo claro/oscuro y navegación por permisos. El catálogo permite
buscar productos, registrar/editar datos e imágenes, gestionar categorías y
activar/desactivar. La eliminación definitiva exige confirmación y ausencia
de relaciones; los registros con historial se conservan mediante desactivación.

Clientes permite búsqueda exacta por documento o teléfono, alta, edición,
perfil, actividad, nivel VIP, saldo de puntos y direcciones paginadas. Crear y
editar requiere `clientes/gestionar`; `clientes/buscar` conserva acceso de
consulta. El historial de puntos usa el nuevo GET `/api/clientes/:id/puntos`,
limitado al permiso de gestión y al filtro exacto del cliente. La interfaz no
modifica saldos ni niveles VIP, ni implementa todavía las reglas de ganancia y
canje. Tampoco descuenta inventario: su integración pertenece a fases posteriores.

Se verificaron lint y compilación del frontend, HTTP/MySQL para clientes,
direcciones e historial de puntos, permisos separados, CSRF, duplicados,
paginación y aislamiento entre clientes. En navegador se comprobaron alta y
edición (incluido cambio de documento), direcciones principales, error duplicado
sin perder captura, consulta de puntos, acceso de cajero, Escape y presentación
clara/oscura a 390 y 320 px sin desbordamiento de la página. Los datos de prueba
son temporales y se retiran al terminar. Detalles: [frontend/README.md](frontend/README.md),
[backend/CATALOGO.md](backend/CATALOGO.md) y [backend/CRM.md](backend/CRM.md).

## Fase 21: API de recetas BOM y deltas

Se añadió `/api/recetas` con permiso `catalogo/gestionar`, validación estricta,
consulta de insumos/unidades, vínculos de ingredientes, reemplazo completo
atómico y deltas de modificadores. Una receta de variante sustituye a la base;
los extras y exclusiones respetan sus grupos y no pueden dejar consumo negativo.

La conversión utiliza decimales exactos: 200 g se almacenan como 0.2000 kg.
La cantidad guardada ya es bruta; la merma no se aplica dos veces. El resolver
produce una copia congelada para persistirla al crear la tarea, dentro de la
misma transacción. No crea pedidos reales, cambia tareas existentes ni realiza
reservas o movimientos de stock. La interfaz corresponde a la fase 22.

Pasaron seis pruebas unitarias (`npm.cmd run test:recetas`) y pruebas HTTP/MySQL
de acceso, CSRF, unidades, precedencia, deltas, concurrencia y rollback. Se
comprobó un snapshot persistido en una tarea temporal y su conservación tras
cambiar la receta; físico y reservado permanecieron iguales. Se retiraron todos
los fixtures. Contratos, ejemplos y archivos: [backend/RECETAS.md](backend/RECETAS.md).

## Fase 22: constructor visual de recetas

Ruta `/recetas`, protegida por `catalogo/gestionar`, disponible en el menú,
Inicio y la acción Receta de los platos preparados del Catálogo. Permite elegir
producto y variante, buscar insumos activos, añadir o retirar ingredientes y
guardar la receta completa. La variante puede copiar la base para personalizarla;
su guardado no modifica la receta base.

Se captura bruto o neto, unidad compatible y merma. La vista previa muestra
bruto, neto estimado y rendimiento por ingrediente. Por ejemplo, 200 g netos con
20 % de merma se guardan como 0.2500 kg brutos. Al reabrir se muestra bruto en
unidad base, evitando aplicar otra vez la merma. No se suman kg, litros y unidades.

Los campos incompletos impiden enviar el conjunto. Si el servidor rechaza un
guardado, la captura permanece disponible. Los cambios pendientes tienen aviso
al navegar, cambiar producto/variante, usar Atrás/Adelante o recargar. Las
consultas anteriores se cancelan para evitar mostrar otra receta por error.

Archivos principales: `pages/Recetas.jsx`, los seis componentes de
`components/recetas`, `services/recetas.service.js`, `utils/recetas.js`,
`hooks/useConsultaRemota.js` y `styles/recetas.css`. `main.jsx` utiliza el router
de datos para proteger también la navegación del navegador. El GET del backend
incorpora los datos del producto seleccionado.

Validación: ESLint, cuatro pruebas numéricas del frontend, compilación y pruebas
HTTP/MySQL de recetas. En navegador se comprobaron guardado y reapertura,
conversión, merma, variante independiente, errores conservando campos,
protección de navegación y acceso denegado al cajero. Diseño claro/oscuro y
adaptación a 390/320 px. Los datos temporales se retiraron después de las pruebas.
Esta fase configura recetas; las reservas y consumos de existencias corresponden
al inventario transaccional de la fase 23.

## Fase 23: inventario transaccional y Kardex

Se implementaron los servicios internos `reservarTareas`, `consumirTarea`,
`liberarTarea` y `registrarMovimiento`, reutilizando las tablas existentes.
La reserva valida disponibilidad agregada de todas las tareas y aumenta solo
reservado; el consumo disminuye físico/reservado y guarda Kardex/costos; liberar
antes de preparar no incrementa físico. La receta se toma del snapshot de la
tarea, sin recalcular el maestro ni aplicar otra vez merma.

Los insumos se bloquean por ID ascendente. Saldos y movimientos se confirman
atómicamente; identidades de operación y estados de reserva evitan duplicados.
Los ingresos calculan promedio ponderado móvil con decimales exactos y cada
consumo conserva su costo. Las salidas generales no invaden stock reservado.

Pasaron cuatro pruebas numéricas y pruebas MySQL: última porción concurrente,
comandos repetidos, liberación, insuficiencia agregada, cinco tipos de Kardex,
promedio, snapshots, quiebre e inactividad. Se simuló un fallo entre saldo y
Kardex y otro en el segundo ingrediente: todo se revirtió. Se retiraron los
registros temporales.

No se añadieron rutas HTTP ni pantalla de inventario en esta fase. Los futuros
flujos de pedidos/KDS/compras deben invocar los servicios con su misma
transacción, permisos, autorizaciones e historial; el cobro no descuenta stock.
El monitor corresponde a la fase 24. Contratos, alcance y comandos:
[backend/INVENTARIO.md](backend/INVENTARIO.md).

## Fase 24: monitor de inventario

Ruta `/inventario`, accesible desde menú e Inicio con `inventario/gestionar`.
Muestra físico, reservado, disponible y mínimo en la unidad base del insumo.
La búsqueda encuentra insumos por nombre/código o por nombre/SKU/código de
barras de un producto directo vinculado. Incluye filtros de stock bajo, sin
disponible y quiebre declarado, con indicadores de la búsqueda completa.

Cada detalle presenta historial paginado de Kardex y conciliación: entradas,
salidas, reservas activas, diferencias con saldos oficiales y último saldo
registrado. El cálculo supone saldo inicial cero; una apertura debe tener
movimiento. Las diferencias se muestran para revisión sin modificar los datos.
La acción Stock del Catálogo abre el saldo del insumo de un producto directo;
no utiliza el campo legado de stock del producto.

Se añadieron servicio/controlador/router de consulta del backend, pantalla,
servicio y componentes del frontend, con consultas cancelables y reintento.
Pasaron lint/build y pruebas HTTP/MySQL de sesión/permisos, filtros, paginación,
alertas, historial, producto directo y diferencias sin corrección automática.
Revisión visual en claro/oscuro, móvil 390/320 px y perfil cajero sin acceso.
Todos los fixtures se retiraron. Contratos y comprobaciones:
[backend/INVENTARIO.md](backend/INVENTARIO.md), [frontend/README.md](frontend/README.md).

## Fase 25: proveedores y compras

Ruta `/compras`, con permiso `inventario/gestionar`, accesos desde menú e Inicio.
Permite registrar/editar proveedores y dar de alta insumos en kg, L o un sin saldo
inicial. Las compras tienen cabecera, líneas, fechas e IGV como importe. El
servidor calcula subtotales y total con decimales exactos; el frontend presenta
la misma estimación. Los borradores se pueden editar sin afectar existencias.

Confirmar ingresa todas las líneas en una transacción, actualiza promedio y
guarda Kardex. La factura por proveedor, el UID estable y la revisión del
contenido evitan duplicados y cambios obsoletos. Una compra confirmada conserva
sus líneas; corregirla requiere un documento compensatorio completo separado,
aprobación sensible de un solo uso y stock disponible suficiente sin reservas.
La compensación utiliza costo promedio vigente y conserva importes históricos;
no se registran pagos al proveedor ni compensaciones parciales en esta fase.

Pasaron tres pruebas unitarias del backend, dos de vista previa del frontend,
lint/build y pruebas HTTP/MySQL: borrador sin ingreso, reintentos/concurrencia,
factura duplicada, promedio, autorización y rollback en segunda línea. En
navegador se guardó y confirmó una compra temporal, se verificó su ingreso y
conciliación en Inventario, validación conservando captura, descarte cancelado,
modos claro/oscuro, móvil 390/320 px y acceso denegado al cajero. Se retiraron
todos los fixtures. Contratos, decisiones y archivos:
[backend/COMPRAS.md](backend/COMPRAS.md).

## Fase 26: carrito y estimación decimal

Borrador Zustand por empleado con variantes, modificadores y cantidades,
edición en diálogo y cálculo estimado con céntimos BigInt. La recuperación
local guarda exclusivamente identificadores y cantidades, sin credenciales.
La vista de desarrollo `/pruebas-carrito`, con `catalogo/gestionar`, comprueba
30 líneas, corrección y recuperación. Catálogo actualizado en memoria; una
línea inválida impide presentar un total parcial como total completo.

La consulta puntual `GET /api/productos/:id` permite rehidratar productos
fuera de la página visible, con los permisos administrativos existentes.
No registra pedidos ni reserva stock; el futuro servidor de pedidos debe
validar disponibilidad/precios y devolver el importe definitivo.

Pasaron ocho pruebas unitarias, lint/build y escenario de navegador con API
simulada: 30 líneas, edición, F5, actualización de precios, producto retirado,
aislamiento por empleado, logout y móvil 390 px en ambos temas. La consulta
real sin sesión devuelve 401. Detalles: [frontend/CARRITO.md](frontend/CARRITO.md).

## Fase 27: interfaz operativa del punto de venta

`/pos` requiere sesión y `ventas/cobrar`. Combina catálogo con fotos, categorías
activas y búsqueda en vivo con un borrador editable. En escritorio hay dos
paneles; en móvil se alternan catálogo y pedido, con total flotante compartido.
La personalización consulta los precios actuales y valida presentaciones,
extras obligatorios y cantidades enteras de 1 a 10000. Los cálculos usan céntimos
BigInt; una línea inválida impide mostrar un total parcial como completo.

Revisión del 17/10/2026: se corrigieron reintentos, total móvil, selección de la
presentación base al editar, cantidades inválidas, precios desactualizados y
productos de categorías desactivadas. Se retiraron el IGV fijo y los métodos
supuestamente auditados: esta fase prepara un borrador y permite revisarlo;
no registra pedidos, pagos ni movimientos de stock.

Validación: 15 pruebas de carrito/POS, ESLint y build; integración HTTP/MySQL
con sesión, permisos, filtros y categorías inactivas; navegador Edge con API
simulada: reintentos tras error, F5, aislamiento por empleado, 30 líneas, diez
extras, importes grandes, anchos 320/390/768/1280, rotación y ambos temas.
El teclado virtual nativo queda pendiente de comprobación en un teléfono real;
se comprobó foco de entrada y diálogo con altura reducida en navegador.
Archivos, comandos y límites: [frontend/POS.md](frontend/POS.md).

## Carta del negocio cargada

Se registró la carta de `DOCUMENTACION/CARTA/VENEZIANA CARTA.pdf`: **97 productos,
11 categorías y 109 presentaciones**, con adicionales y elecciones de cocina.
Cecina familiar S/41 según confirmación del propietario. Incluye 56 imágenes
referenciales con créditos visibles en el POS (Commons y fuentes de marca/distribuidor).

La carga es transaccional e idempotente. Catorce artículos envasados tienen
insumo directo con saldo cero; no se inventaron existencias ni recetas.
Las quince tarifas de delivery se muestran como referencia, sin cobro automático.

Desde backend: `npm.cmd run carta:validar`, `npm.cmd run carta:importar` y
`npm.cmd run test:carta`. Precios revisables en `backend/data/carta-precios.csv`.
Detalle de archivos, fuentes, decisiones y pruebas: [backend/CARTA.md](backend/CARTA.md).

### Presentaciones de bebidas en el POS

La carta conserva 97 artículos independientes y el POS muestra 87 tarjetas:
Coca-Cola, Inca Kola y Agua San Luis se agrupan visualmente por marca, con un
selector de tamaños y precios completos. Gordita solo está en Inca Kola;
San Luis ofrece 625 ml S/3 y un litro S/5. Cada selección conserva el ID real
del envase y su stock/historial. La edición permite cambiar tamaño conservando
cantidad. Pruebas y archivos: [frontend/POS.md](frontend/POS.md).
