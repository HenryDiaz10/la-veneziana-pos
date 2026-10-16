# API de recetas BOM - fase 21

Administra las tablas existentes `recetas_bom_master` y `modificadores_bom`.
No ejecuta migraciones, no reserva ni descuenta inventario y no modifica tareas
históricas. Solo admite recetas de platos preparados; productos directos usan
su insumo vinculado y combos sus componentes.

## Acceso y rutas

Prefijo `/api/recetas`. Todas las rutas requieren sesión y `catalogo/gestionar`.
POST, PUT y DELETE conservan la protección CSRF global.

| Método | Ruta | Finalidad |
| --- | --- | --- |
| GET | /insumos?pagina=1&limite=20&busqueda=... | Insumos para el editor con unidad y unidades compatibles. |
| GET | /productos/:productoId | Receta base configurada. |
| GET | /productos/:productoId?variante_id=... | Conjunto específico; vacío si todavía no existe. |
| POST | /vincular | Añadir o actualizar un ingrediente. |
| PUT | /productos/:productoId | Sustituir una receta completa, atómicamente. |
| GET | /modificadores/:modificadorId | Deltas configurados de la opción. |
| POST | /modificadores/vincular | Añadir o actualizar un delta. |
| DELETE | /modificadores/:modificadorId/insumos/:insumoId | Retirar solo el delta; repetible, responde 204. |
| POST | /resolver | Calcular receta y snapshot sin persistir tareas ni movimientos. |

GET /insumos devuelve `insumos` y `paginacion`; 20 registros por defecto, máximo
50, hasta 10000 páginas. Busca literalmente por nombre/código antes de paginar.
Incluye `activo`, `unidad` y `unidades_compatibles`, sin costos ni saldos.
El editor debe deshabilitar insumos inactivos. Otros GET devuelven `receta` o
`deltas`. La receta del editor se consulta sin aplicar extras ni fallback.

## Cantidades y unidades

La unidad base se obtiene de `insumos_almacen.unidad_medida_id` y `unidades_medida`.
Bases admitidas: kg, L y un. Se convierte entre kg/g o L/ml; no entre masa,
volumen y unidades. El código de entrada admite mayúsculas/minúsculas.

Enviar decimales como cadenas. También se admiten números JSON cuya forma
decimal sea válida. Se rechazan comas, cadenas en notación científica y campos
calculados como `variante_clave`. Entrada con hasta 8 decimales; cálculo mediante
enteros BigInt y fracciones, seguido de cuantización a cuatro decimales con
**mitad alejándose de cero**. Valores que se vuelven cero o exceden DECIMAL(12,4)
se rechazan, sin truncarlos. Unidad omitida significa cantidad ya expresada en
la unidad base; la interfaz puede convertir antes de enviar o indicar la unidad.

POST /vincular, ejemplo (los IDs deben existir):

```json
{
  "producto_venta_id": 1,
  "variante_id": null,
  "insumo_id": 1,
  "cantidad_bruta_necesaria": "200",
  "unidad": "g",
  "porcentaje_merma_esperado": "10.00"
}
```

Si el insumo está en kg, guarda **0.2000 kg**. Responde 201 al crear y 200 al
actualizar el mismo producto/variante/insumo. La cantidad debe ser positiva.
Merma: de 0.00 a 99.99, máximo dos decimales, valor predeterminado 0.00.
La cantidad ya es **bruta** y no se vuelve a multiplicar por la merma. Un futuro
formulario que capture neto deberá calcular bruto = neto / (1 - merma/100)
antes de enviar; esta API recibe siempre bruto.

## Recetas completas y variantes

PUT /productos/:productoId recibe `variante_id` (opcional/null para base) e
`ingredientes`: una lista de objetos con los mismos campos del ingrediente
anterior, sin producto_venta_id ni variante_id. Exige entre 1 y 100 insumos
únicos y activos. Se valida y convierte todo antes de sustituir; un fallo
revierte el conjunto. La variante debe pertenecer al producto. El bloqueo del
producto serializa las escrituras concurrentes, incluidos los vínculos individuales.

Un conjunto específico no vacío se considera la receta completa de esa variante
**y sustituye totalmente a la base**; no se suman ambos. Si la variante no tiene
filas, el resolver utiliza la base. Usar PUT para publicar el conjunto completo
en una operación. POST /vincular publica inmediatamente el cambio individual,
sin estado borrador. El GET del editor permite ver insumos inactivos para corregirlos.

## Deltas de modificadores

POST /modificadores/vincular recibe `modificador_id`, `insumo_id`,
`delta_cantidad_base` y opcionalmente `unidad`. El propietario es una opción de
`modificadores_items`, no el grupo. Se permiten hasta 100 insumos por opción.
Extra exige delta positivo; exclusión exige negativo. La conversión es la misma
que para ingredientes. Retirar un delta no elimina la opción ni otras recetas.

Se bloquea grupo, opción e insumos; las lecturas actuales tras esperar el grupo
impiden usar una vista obsoleta bajo REPEATABLE READ y duplicar un alta concurrente.

## Resolver y congelar

POST /resolver acepta exclusivamente:

```json
{
  "producto_venta_id": 1,
  "variante_id": null,
  "cantidad": 2,
  "modificadores": [1]
}
```

Cantidad entera de 1 a 10000 (por defecto 1), hasta 50 IDs de opciones distintos
(por defecto ninguno). El servidor carga los deltas; no admite cantidades libres
ni notas para modificar el consumo. Comprueba la asignación al producto, selección
única/múltiple y grupos obligatorios. Producto, categoría e insumos deben estar activos.

Selecciona variante/base, suma deltas por insumo y rechaza todo resultado negativo.
Omite ingredientes que queden en cero, exige una receta final no vacía, multiplica
por cantidad de platos y comprueba rango. La merma no se aplica de nuevo.

La respuesta `receta` es un snapshot con `version: 1` de esquema, identidad y
nombres de producto/variante, origen base/variante, cantidad y opciones seleccionadas.
Cada ingrediente conserva ID, nombre, unidad e cantidades brutas unitaria y total.

`resolverReceta(datos, { transaction })` puede usar la transacción que vaya a
crear la tarea. El llamador debe comprobar `estado === 'consultado'` y persistir
el resultado en `kds_tareas.snapshot_json` junto al resto de la confirmación.
`congelarSnapshotReceta` devuelve una copia profunda e inmutable. La confirmación
real de pedidos se integrará en su fase: este endpoint solo calcula una
previsualización y no reescribe tareas existentes.

## Errores y archivos

400: formato, unidad, rango o selección; 401/403: acceso; 404: relaciones
inexistentes o variante ajena; 409: inactividad, tipo de producto, receta ausente,
vacía o consumo negativo. Fallos inesperados pasan al manejador general sin SQL.

- `src/validators/recetas.js`: entradas estrictas y decimales.
- `src/services/recetas-calculo.js`: conversión exacta, cuantización y copia congelada.
- `src/services/recetas.service.js`: consultas, vínculos, reemplazo, deltas y resolución.
- `src/controllers/recetas.controller.js`: parámetros, HTTP y mensajes públicos.
- `src/routes/recetas.routes.js`: rutas y permiso; app.js monta el router.
- `tests/recetas-calculo.test.js`: seis pruebas sin base de datos.

## Verificación

Desde backend, `npm.cmd run test:recetas`. Pasaron las seis pruebas unitarias y
pruebas HTTP/MySQL con fixtures temporales: 200 g a 0.2000 kg, merma sin segundo
descuento, sustitución por variante, unidades incompatibles, variante ajena,
rollback de lote, altas concurrentes de ingredientes y deltas sin duplicados,
reglas de grupos, consumo negativo, receta vacía, permisos y CSRF.
Un snapshot persistido en una tarea temporal conservó 0.1500 kg tras cambiar
receta y delta a una combinación de 1.3000 kg. Los saldos físicos y reservados
no cambiaron. Todos los fixtures se retiraron. Sin dependencias nuevas ni DDL.
