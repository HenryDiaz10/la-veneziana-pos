# Proveedores y compras - fase 25

Ruta frontend `/compras`, con sesión y `inventario/gestionar`. El backend exige
el mismo permiso, obtiene el actor de la sesión y conserva CSRF en escrituras.
Se reutilizan proveedores_maestro, compras_facturas, compras_detalle, audit_logs,
autorizaciones_sensibles e inventario_kardex. Sin nuevas tablas o dependencias.

## Operación

1. Registrar proveedor activo: razón social, RUC de 11 dígitos, contacto y días
   de crédito. Se valida formato, sin consultar un padrón externo. El RUC no
   cambia después de registrar documentos; el proveedor puede desactivarse.
2. Registrar insumos si faltan: código, nombre, unidad base kg/L/un y mínimo.
   El alta siempre tiene stock físico/reservado y costos en cero; no acepta
   campos libres de saldo. Reutiliza o crea la unidad canónica necesaria.
3. Crear un borrador con proveedor, número de documento, fecha y líneas con
   cantidad base/costo unitario. Guardar o editar un borrador no mueve stock.
4. Revisar y confirmar. La misma transacción bloquea la compra y los insumos,
   registra INGRESO_COMPRA, actualiza físico/promedio y marca confirmada.
5. Las líneas confirmadas quedan cerradas. Una corrección completa genera
   un documento compensatorio separado y salidas autorizadas; no edita la
   factura ni sus movimientos históricos.

El vencimiento es opcional y no puede ser anterior a la emisión. Número de
documento: hasta 50 letras/números, `/` o `-`, normalizado a mayúsculas, sin
espacios. No hay cobros, pagos al proveedor ni cambios de estado_pago en esta
fase; registro y pago permanecen separados.

## Cantidades e importes

Cantidad y costo unitario se capturan en la unidad base del insumo con hasta
cuatro decimales. No se captura g/ml en esta pantalla. Se usa BigInt para
operaciones y redondeo a dos decimales por línea, mitad alejándose de cero.
Subtotal = suma de líneas redondeadas; total = subtotal + IGV capturado.
IGV es un **importe** de hasta dos decimales, no una tasa automática. El cliente
no puede imponer subtotal o total. Fechas y límites se validan en el servidor.

Convención inicial de valoración: costo unitario de almacén neto de descuentos,
sin IGV recuperable; el impuesto del documento se registra por separado. Esta
convención debe coincidir con la valoración de los documentos del negocio. No
se introduce aquí una segunda valoración contable distinta del costo capturado.
El promedio móvil y el último costo utilizan el servicio de inventario de la
fase 23. Cada movimiento conserva el costo de su propio momento.

## API

Prefijo `/api/compras`. Listados: pagina 1..10000, limite 1..50 (20 por defecto),
busqueda literal de hasta 150 caracteres. Campos de consulta desconocidos,
repetidos, arrays u objetos son rechazados. La lista de compras añade estado
todos/borrador/confirmada/compensada y busca número de documento.

| Método y ruta | Finalidad |
| --- | --- |
| GET / | Documentos de compra y compensaciones, paginados. |
| POST / | Crear/reintentar un borrador con operacion_uid estable. |
| GET /:id | Cabecera, proveedor, líneas, movimientos y vínculos de compensación. |
| PUT /:id | Sustituir cabecera/líneas únicamente si sigue en borrador y coincide revision. |
| POST /:id/confirmar | Confirmar todos los ingresos; recibe revision. |
| POST /:id/compensar | Compensar completamente con documento, motivo, revision y autorizacion_id. |
| GET /proveedores | Buscar razón social/RUC, con paginación. |
| POST /proveedores | Alta de proveedor. |
| PUT /proveedores/:id | Editar datos permitidos/estado del proveedor. |
| GET /insumos | Buscar insumos con unidades compatibles, sin acceso de catálogo adicional. |
| POST /insumos | Alta de insumo sin saldo inicial. |

POST / y PUT /:id reciben:

```json
{
  "proveedor_id": 1,
  "numero_factura": "F001-000123",
  "fecha_emision": "2026-10-16",
  "fecha_vencimiento": null,
  "igv": "3.60",
  "lineas": [
    { "insumo_id": 1, "cantidad_base": "2.0000", "costo_unitario": "10.0000" }
  ],
  "operacion_uid": "compra:00000000-0000-4000-8000-000000000001"
}
```

Los IDs deben existir. De 1 a 100 insumos distintos y activos. En edición,
reemplazar operacion_uid por revision devuelta por el GET; no cambiar el UID.
El ejemplo de UID es ilustrativo: el frontend genera UUID v4 para cada alta.

La revision es una huella del contenido de cabecera y líneas. Impide editar o
confirmar una versión antigua. No depende de las fechas o el estado de registro,
por lo que repetir una confirmación exitosa sigue siendo reconocible.

## Transacciones e idempotencia

- Proveedor/documento tiene la restricción única existente; otro UID no evita
  la detección de la misma factura. El mismo UID con contenido o actor distinto
  responde conflicto; con contenido idéntico devuelve el borrador ya creado,
  también ante altas concurrentes.
- Confirmar bloquea la compra antes de sus insumos, en orden ascendente. Cada
  ingreso usa `mov:compra:ID:insumo:ID`. El estado confirmado y las filas previenen
  una segunda entrada. Un error en cualquier línea revierte la operación entera.
- El borrador se reemplaza dentro de una transacción; las líneas anteriores no
  desaparecen si falla la validación o la escritura. La confirmada no se edita.
- Hay como máximo dos reintentos adicionales de la transacción completa ante
  deadlock; nunca se repite solo una parte de la escritura.

## Documento compensatorio completo

Nueva política sensible `compras/compensar`, entidad `compras_facturas`, permiso
inventario/gestionar. La aprobación existente de fase 12 sigue exigiendo
seguridad/gestionar al aprobador, verifica actor/recurso/vigencia y es de un
solo uso. La interfaz ofrece autorizar y compensar a quienes pueden aprobar.
No se solicitan ni guardan contraseñas de otro empleado en la pantalla.

La compensación consume la autorización en la **misma transacción** del retiro.
Comprueba revision, compra confirmada e ingresos originales respaldados en
Kardex. Exige disponible suficiente para todas las cantidades: no invade reservas
ni retira cantidades ya inexistentes. Si falla, tampoco se consume la aprobación.

Se crea otra cabecera de compras_facturas con número documental distinto,
las líneas positivas originales y operacion_uid `compensacion:ID_ORIGINAL`.
Se identifica como tipo_documento=compensacion y compra_origen_id en la API.
Nota y compra original quedan en estado compensada. No se pueden editar ni
volver a confirmar. La referencia es estructurada y única; no depende de notas.

Sus movimientos son SALIDA_AJUSTE, con referencia a la **nueva** cabecera y costo
promedio vigente. No se restaura retrospectivamente un promedio anterior ni se
reescriben costos de consumos posteriores. Las magnitudes documentales son
positivas; su naturaleza compensatoria se comunica por el tipo y vínculo. Los
reportes futuros deben interpretar ambos, no sumarla como una nueva compra.
No contempla compensación parcial ni liquidación de dinero al proveedor.

AuditLog conserva origen, documento, motivo, revision y autorización usada.
Repetir la misma compensación por el mismo actor devuelve el documento previo;
reutilizarla con documento/motivo/revision distintos responde conflicto.

## Archivos y pruebas

- `src/validators/compras.js`: campos, proveedor/insumo, fechas y cálculo decimal.
- `src/services/compras.service.js`: datos maestros, borradores, confirmación,
  compensación y consultas. Usa `inventario.service.js` y la aprobación existente.
- `src/controllers/compras.controller.js`, `src/routes/compras.routes.js` y
  registro en app.js: API protegida y mensajes públicos.
- `src/security/politicasAutorizacion.js`: política de compensación por compra.
- `tests/compras-calculo.test.js`: tres pruebas numéricas/validación sin MySQL.
- `tests/compras-integracion.js`: HTTP/MySQL local con fixtures temporales propios.

Desde backend:

```powershell
npm.cmd run test:compras
npm.cmd run test:compras:integracion
```

Comprobado: 401/403/CSRF, proveedores e insumos sin saldo inicial, fechas y
totales estrictos, borrador sin ingresos, documento/UID duplicados, alta y
confirmación concurrentes, revision antigua, modificación prohibida tras
confirmar y promedio móvil con costos históricos preservados. Fallos simulados
en la segunda línea de confirmación/compensación revierten todo; la aprobación
permanece disponible si falla. La compensación es única, separada y respeta
reservas. Los registros temporales se retiran al terminar. `--vista` mantiene
fixtures hasta recibir una línea por stdin, como la prueba del monitor.
