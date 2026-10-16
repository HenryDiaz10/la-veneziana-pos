# API de catálogo - fase 19

## Estructura y archivos

Se utilizan las tablas existentes: categorias_venta, productos_venta,
variantes_producto, modificadores_catalogo, modificadores_items y
producto_modificadores. No se ejecuta sync ni DDL desde las rutas.

Rutas de archivos relativas a backend/src:

| Bloque | Validador | Servicio | Controlador / router |
| --- | --- | --- | --- |
| Categorías | validators/categorias.js | services/categorias.service.js | controllers/categorias.controller.js / routes/categorias.routes.js |
| Productos | validators/productos.js | services/productos.service.js | controllers/productos.controller.js / routes/productos.routes.js |
| Variantes | validators/variantes.js | services/variantes.service.js | controllers/variantes.controller.js / routes/variantes.routes.js |
| Grupos | validators/modificadores.js | services/modificadores.service.js | controllers/modificadores.controller.js / routes/modificadores.routes.js |
| Opciones | validators/modificadores.js | services/modificadores-items.service.js | controllers/modificadores-items.controller.js / routes/modificadores-items.routes.js |
| Asignaciones | IDs comprobados en controlador y servicio | services/productos-modificadores.service.js | controllers/productos-modificadores.controller.js / routes/productos-modificadores.routes.js |

Los archivos de esta tabla son nuevos. app.js se modificó para montar los
routers principales. Los routers de productos y modificadores montan sus
rutas hijas con mergeParams para conservar el identificador propietario.

## Funciones principales

- validarCategoria: normaliza nombre y slug, comprueba color, orden, URL y
  booleanos; admite actualización parcial sin campos desconocidos.
- normalizarPrecio: convierte número o texto válido a cadena con dos decimales.
  Rechaza negativos, más de dos decimales y valores fuera de DECIMAL(12,2).
- validarProducto: admite solo campos editables del catálogo; excluye costos,
  stock y márgenes calculados.
- validarVariante: valida nombre y precio adicional; excluye producto_id y costo.
- validarGrupoModificador / validarItemModificador: validan nombres, booleanos
  de selección/exclusión y el importe adicional de cada opción.
- obtenerCategoriasPaginadas, obtenerProductosPaginados,
  obtenerVariantesPaginadas, obtenerGruposPaginados y obtenerItemsPaginados:
  seleccionan campos y limitan registros. Las consultas hijas filtran propietario.
- crearCategoria / actualizarCategoria y crearProducto / actualizarProducto:
  validan y escriben mediante transacciones; detectan restricciones únicas.
- comprobarRelaciones: exige categoría activa para producto activo; los directos
  necesitan insumo, activo si el producto está activo. Platos y combos no usan
  insumo directo ni control directo de stock. Valida el registro combinado.
- crearVariante / actualizarVariante y crearItemModificador /
  actualizarItemModificador: bloquean al propietario, comprueban nombres repetidos
  en ese ámbito y evitan editar mediante la ruta de otro propietario.
- crearGrupoModificador / actualizarGrupoModificador: gestionan nombre y reglas
  del grupo, sin inventar estado o columna activa que no existen en la tabla.
- obtenerGruposProducto: consulta vínculos paginados y sus datos de grupo.
- asignarGrupoProducto / retirarGrupoProducto: comparten cambiarVinculo;
  bloquean producto y grupo en ese orden. Repetir no duplica registros y retirar
  elimina únicamente el vínculo, conservando grupo, opciones y otros productos.
- serializarProducto, serializarVariante y serializadores de grupos/opciones:
  devuelven campos explícitos; no dependen de que reload retire defaults.

Los controladores convierten IDs y paginación y traducen resultados a HTTP.
Los routers autentican y exigen catalogo/gestionar antes de las operaciones.

## Contrato HTTP

Prefijo /api. Todas las rutas requieren cookie de sesión y catalogo/gestionar.
POST, PATCH, PUT y DELETE conservan Origin y X-CSRF-Protection: 1 del cliente
autorizado. Esta API administra catálogo; todavía no es la consulta operativa
limitada del POS.

| Recurso | Operaciones |
| --- | --- |
| /categorias | GET, POST y PATCH /:id. |
| /productos | GET, POST y PATCH /:id. |
| /productos/:productoId/variantes | GET, POST y PATCH /:varianteId. |
| /modificadores | GET, POST y PATCH /:grupoId. |
| /modificadores/:grupoId/items | GET, POST y PATCH /:itemId. |
| /productos/:productoId/modificadores | GET; PUT /:grupoId y DELETE /:grupoId sin campos en el cuerpo. |

GET paginados: pagina predeterminada 1, limite 20; máximos 10000 y 50.
Devuelven el arreglo y paginacion con pagina, limite, total y totalPaginas.
Altas devuelven 201; consultas y cambios, 200. Asignar/retirar devuelven 200
y creado/eliminado para indicar si hubo cambio. Entradas inválidas: 400;
recursos inexistentes: 404; duplicados y conflictos de categoría/insumo: 409.
Una categoría o insumo inexistente en el cuerpo del producto devuelve 400.
Falta de sesión: 401; falta de permiso o CSRF: 403.

Categorías se desactivan con activa:false y productos con estado:inactivo.
No hay borrado físico de productos, categorías, variantes, grupos u opciones
mediante estas rutas. Los nombres de grupos pueden repetirse; los nombres de
variantes y opciones no pueden repetirse dentro de su respectivo propietario
mediante estos servicios. Esta última regla se coordina con bloqueo, sin un
nuevo índice de base de datos.

## Comprobaciones

Pruebas de sintaxis, imports y HTTP/MySQL con datos temporales: permisos,
CSRF, paginación, tipos, campos desconocidos, precio cero, decimales y límites,
relaciones, creación, edición, inactivación y respuestas con campos explícitos.
Altas simultáneas de slug, SKU, variantes y opciones: un éxito y un 409.
Cambios duplicados revertidos. Edición de variantes/opciones desde otro
propietario rechazada. Asignación simultánea de grupos sin duplicados;
retirada repetida conserva grupo, opciones y asignaciones de otros productos.

Los registros temporales se eliminaron. No se alteraron credenciales ni
usuarios reales. El soporte de clientes se documenta por separado en CRM.md;
las interfaces administrativas corresponden a la fase 20.
