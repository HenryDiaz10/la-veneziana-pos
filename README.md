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
- Fase 10: 51 migraciones aplicadas en MySQL, asociaciones de los
  modelos, datos iniciales sin duplicados y pruebas reales de
  restricciones, columnas calculadas y consultas relacionadas.
- Fase 11: login HTTP con bcrypt, JWT firmado, bloqueo temporal
  por usuario, límite por IP y alta interactiva del administrador inicial.
- Fase 12: sesiones persistentes, autenticación y permisos por solicitud,
  gestión de empleados y roles, recuperación administrativa de acceso
  y base transaccional de autorizaciones sensibles de un solo uso.

El frontend muestra una pantalla inicial. El backend ya se conecta
con MySQL y tiene creadas las 51 tablas del SQL de referencia,
con sus modelos y asociaciones disponibles desde src/models/index.js.

El backend dispone de login, consulta y cierre de sesión, rutas protegidas
por permisos y gestión administrativa de empleados y roles. Siguen
pendientes los servicios operativos de negocio y su integración con el
frontend. Las autorizaciones sensibles se integrarán en las transacciones
de ajustes y devoluciones cuando se implementen esos módulos.

Las secciones por fase describen lo realizado en cada etapa.
Los pendientes de migraciones y asociaciones mencionados en las
fases 7 a 9 se resolvieron en la fase 10, documentada al final.

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

Continúan pendientes el frontend de login, las cookies HttpOnly/Secure y
la protección CSRF cuando corresponda. El transporte actual usa Bearer;
no guardar credenciales de sesión en localStorage. No se implementaron
tokens de renovación. La integración de auditoría de operaciones de
seguridad y los servicios del negocio se desarrollarán por separado.
