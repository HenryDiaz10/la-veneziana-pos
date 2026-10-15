## Estado del proyecto

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

El frontend muestra una pantalla inicial. El backend ya se conecta
con MySQL y tiene definidos los 51 modelos correspondientes a las
tablas del SQL de referencia.

La creación de tablas mediante migraciones, las asociaciones,
los datos iniciales, los servicios de negocio, las API del negocio y su
integración con el frontend siguen pendientes.

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

JWT todavía no se utiliza para autenticar: su secreto queda
preparado para la fase correspondiente.

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