# Fase 35 - Modificadores y notas de preparación

Se consolida el recorrido ya iniciado en recetas, carrito y POS: configuración
del producto, selección, revisión, registro SQL, snapshot de cocina e impresión.
No se crean tablas, migraciones, grupos u opciones de la carta real.

## Uso

1. Abrir un producto del POS y elegir los grupos que corresponden. Los grupos
   obligatorios exigen selección; los simples admiten como máximo una opción
   y los múltiples permiten varias. Una elección simple opcional se puede
   desmarcar. Solo aparecen grupos vinculados al producto.
2. Las exclusiones se identifican en el selector y en las etiquetas compartidas:
   **Excluir: Sin aceitunas**. Una opción normal conserva su nombre; no se
   presenta todo como un extra con signo más. El precio adicional configurado
   se suma; excluir no crea un descuento automático.
3. Capturar indicaciones de hasta 250 caracteres por línea. Se aplican a todas
   sus unidades. Para otra preparación se agrega otra línea. Los espacios se
   normalizan al guardar; no se interpreta el contenido como HTML.
4. Revisar opciones y notas en el recibo y el diálogo de preparaciones. Se
   conservan al editar y recuperar el borrador después de F5. El borrador guarda
   IDs y notas, sin congelar precios o marcas de catálogo como autoridad.
5. Si se retiró una opción, corregir la selección antes de registrar. La
   configuración incompleta o inválida impide confirmar; un fallo de conexión
   permite reintentar y no equivale a cerrar sesión.
6. Confirmar el pedido envía selecciones y texto; el servidor valida otra vez
   vínculos, reglas, precios y receta. No acepta precios, deltas o banderas
   `es_exclusion` arbitrarias desde la línea del cliente.

Las notas son instrucciones para cocina. No seleccionan opciones ni ajustan
precio o reserva de ingredientes automáticamente. Para registrar una exclusión
con efecto de inventario se usa una opción vinculada y sus deltas de receta.

## Consulta y permisos

Se reutiliza `GET /api/pos/productos/:id` con sesión y `ventas/cobrar`, sin
conceder administración de catálogo. Devuelve producto activo, variantes y
grupos/opciones desde `producto_modificadores`, `modificadores_catalogo` y
`modificadores_items`, con la columna exacta `es_exclusion`.

La configuración completa se lee bajo REPEATABLE READ. Las opciones se obtienen
en lote en lugar de una consulta SQL por grupo. Se verificó una edición
concurrente entre lectura de grupos y opciones: la respuesta conserva un solo
corte de catálogo. No expone costos ni cantidades de los deltas.

El cliente comprueba tipos, IDs únicos, pertenencia, precios exactos y banderas
booleanas de todos los grupos/opciones. Un contrato antiguo que omita
`es_exclusion` se trata como opción normal; una cadena como `"false"` se rechaza.

Registro/ampliación conserva `pedidos/crear`; el cobro mantiene `ventas/cobrar`
y caja propia. No se cambian rutas/permisos para meseros ni se conecta aquí
la operación visual de mesas. La galería de componentes sigue protegida y
disponible únicamente en desarrollo.

## Persistencia e historia

| Destino | Contenido |
| --- | --- |
| `pedido_item_modificadores` | ID de línea/opción y `precio_adicional_grabado`. No se inventa una columna `es_exclusion` en esa tabla. |
| `pedido_items_kds.notas_preparacion` | Texto normalizado y acotado por línea; null si no hay nota. |
| `pedido_items_kds.snapshot_item_json.modificadores` | ID, grupo ID/nombre, nombre de opción, precio y marca booleana `es_exclusion`. |
| `kds_tareas.snapshot_json` | Receta e ingredientes resueltos, modificadores con su marca, notas y canal de cocina/despacho. |
| Consulta de pedido | Opciones históricas y notas del pedido, sin resolver de nuevo el catálogo. |
| Snapshot de venta y ticket | Selección histórica; exclusión etiquetada en el texto térmico interno. |

La fase corrige la pérdida de `es_exclusion` al sustituir la selección de receta
por la comercial en el snapshot KDS. No reescribe preparaciones anteriores.
Si un snapshot antiguo no guardó la marca, no se intenta inferirla desde el
catálogo actual ni desde nombres como “sin”. Se conserva su contenido histórico.

Cambiar después nombres, precios, banderas o BOM no modifica un pedido ya
confirmado, sus reservas ni la preparación guardada. Repetir la identidad
original devuelve el resultado oficial anterior. El ticket no consulta los
modificadores actuales del catálogo.

## Ingredientes e inventario

El resolver existente aplica `modificadores_bom.delta_cantidad_base` en unidades
base, con cuatro decimales exactos. Un extra tiene delta positivo y una exclusión
negativo; el resultado no puede quedar negativo ni producir una receta vacía.
Una opción sin delta solo representa una instrucción/elección y su precio.

Ejemplo de integración: masa 1 unidad, queso 0.2000 kg y aceitunas 0.0500 kg por
pizza; queso extra +0.1000 kg y sin aceitunas -0.0500 kg. Dos pizzas reservan
2 unidades de masa y 0.6000 kg de queso, sin reserva de aceitunas. Precio base
S/20 más extra S/3: S/46 por dos unidades; la exclusión configurada en cero
no resta dinero.

Registrar reserva los ingredientes de la tarea, no descuenta físicamente el
stock ni cobra. Consumir usa el snapshot/reserva una sola vez. Las notas no
modifican esa aritmética. Los productos directos conservan una unidad de su
insumo propio; el flujo actual rechaza modificadores con BOM sobre ellos
en vez de ignorar un delta que no sabe aplicar.

## Archivos y funciones

| Ruta relativa a CODIGO | Responsabilidad |
| --- | --- |
| `backend/src/services/pos.service.js` | `obtenerProductoPos`: lectura coherente y carga agrupada de opciones. |
| `backend/src/services/pedidos.service.js` | Guardar grupo y `es_exclusion` en la selección comercial que acompaña a pedido/KDS. Reutilizar validación y resolución transaccional de receta. |
| `backend/src/services/impresion.service.js` | Congelar etiquetas de exclusión para el ticket desde la selección histórica. |
| `frontend/src/utils/modificadores.js` | `validarGruposModificadores` y `etiquetaModificador`: contrato y presentación compartida. |
| `frontend/src/utils/carrito-estimacion.js` | Mantener importes exactos y añadir `modificadoresDetalle` solo para presentación en memoria. |
| `frontend/src/components/carrito/ResumenModificadores.jsx` | Etiquetas reutilizadas en personalización, selector de prueba, recibo y revisión. |
| `frontend/src/components/carrito/IndicacionesProducto.jsx` | Ayuda accesible sobre alcance de notas y diferencia con opciones de catálogo. |
| `frontend/src/components/pos/ModalPersonalizarProducto.jsx`, `ReciboTermico.jsx` | Mostrar exclusiones y conservar el flujo de selección/revisión responsive. |
| `frontend/src/components/carrito/SelectorProductoCarrito.jsx` | Reutilizar el resumen en la galería de carrito. |
| `backend/tests/modificadores-pedido-integracion.mjs` | SQL, deltas, historia, consistencia, rollback, consumo y ticket simulado. |
| `frontend/tests/modificadores.test.mjs`, `modificadores-navegador.mjs` | Reglas/contrato, etiquetas, edición, F5, notas como texto y adaptación. |

## Pruebas

Desde backend con MySQL local:

```powershell
npm.cmd run test:modificadores:integracion
npm.cmd run test:pos:integracion
npm.cmd run test:pedidos:integracion
```

La integración crea y retira sus propios datos. Prueba grupos ajenos, obligatorios,
exclusividad, IDs duplicados, exclusión excesiva, bandera enviada por el cliente,
reserva/consumo exactos e idempotentes, notas SQL/KDS y fallo al guardar una
selección sin líneas parciales. También prueba edición concurrente de catálogo,
historia conservada tras cambiar catálogo/BOM y etiqueta térmica en 58/80 mm.
La política fiscal de prueba vive solo en una transacción revertida; FINANZAS
real no se modifica. No ejecutar integración contra producción.

Desde frontend, con Vite en localhost:5173 para navegador:

```powershell
npm.cmd run test:modificadores
npm.cmd run test:modificadores:navegador
npm.cmd run test:cocina:navegador
npm.cmd run lint
npm.cmd run build
```

El script de navegador usa Edge y Playwright del runtime Codex; admite su ruta
como primer argumento y prefijo de capturas como segundo. Verifica 320, 390,
768 y 1366 px en ambos temas, selección obligatoria/simple/múltiple, opción
retirada, configuración inválida, notas como texto, revisión, edición y F5.

Sin cambios de carta real, impresión física ni tablero KDS en tiempo real.
PDF fuera de Git: `DOCUMENTACION/FASES/FASE_35.pdf`.
Siguiente: fase 36, backend de eventos KDS al confirmar pedidos.
