# Pagos mixtos · fases 29 y 30

**Estado vigente:** la fase 30 conecta registro de pedido, apertura de caja,
checkout y confirmación. La captura sigue sin cobrar por sí sola: después de
prepararla se pulsa «Confirmar cobro». Guía del flujo y recuperación:
[VENTA_FINAL.md](../VENTA_FINAL.md). El detalle siguiente describe la captura
original de fase 29; sus límites de integración ya fueron resueltos en fase 30.

Implementada el 23/10/2026. Ruta `/pagos`, accesible desde el menú con permiso
`ventas/cobrar`. También acepta `/pagos?pedido=ID` para abrir un pedido existente.
El ID se conserva como texto BIGINT. El operador puede introducirlo manualmente.

La consulta `GET /api/pedidos/:id/contexto-pago` entrega el total oficial,
versión/estado/bloqueo de la cuenta, sesión propia de caja, estado de FINANZAS y
posibilidad de canje. No expone la configuración financiera completa ni costos.
No abre caja, modifica pedidos, adquiere checkout, altera puntos ni genera pagos.

## Flujo y comportamiento

1. Consultar un pedido registrado. El borrador del carrito no se trata como pedido.
2. Abrir «Distribuir pago». Elegir efectivo, Yape, Plin, débito, crédito o
   transferencia. Puntos VIP aparece solo con permiso, cliente y equivalencia
   habilitados en el servidor.
3. Indicar el importe aplicado de cada medio. «Completar saldo» usa el resto del
   total oficial, sin modificar ni redondear silenciosamente los otros medios.
4. En efectivo, capturar recibido o elegir «Recibido exacto». El vuelto es recibido
   menos efectivo aplicado, nunca total recibido menos importe global.
5. En pagos digitales, introducir referencia y confirmar verificación operativa.
   Cambiar importe o referencia desmarca la verificación. No se solicitan PAN,
   CVV ni secretos bancarios, ni se afirma una verificación automática de billetera.
6. Preparar y revisar medios, recibido y vuelto. Reabrir conserva la distribución;
   salir con cambios solicita descartarlos. Actualizar el pedido descarta la
   preparación anterior y exige revisar el nuevo contexto.

Ejemplo: Yape S/40 + efectivo aplicado S/60 = total S/100. Recibido S/100 en
efectivo produce vuelto S/40. Aplicado sigue siendo S/100, no S/140.

Se bloquean faltantes, excesos, cero/negativos, más de dos decimales, recibido
insuficiente, referencias incompletas y pagos digitales no verificados. Se
admite coma decimal, sin separadores de miles ni exponentes. Todos los cálculos
usan céntimos BigInt. El canje exige puntos enteros que no superen el saldo;
su importe se deriva de la equivalencia, sin campo libre de precio ni vuelto digital.

No se prepara una cuenta pagada/anulada, de importe cero o con bloqueo ajeno
vigente. La distribución requiere sesión propia abierta; sin ella pueden revisarse
campos y cálculos, pero no preparar el comando. FINANZAS pendiente se señala como
requisito previo al cobro definitivo. La apertura visual y confirmación se integran
con los servicios existentes en el flujo de fase 30.

## Componentes y contratos

| Archivo en frontend/src | Responsabilidad |
|---|---|
| pages/Pagos.jsx | Buscar pedido, mostrar estado/total oficial, abrir modal y revisar distribución preparada. |
| components/pos/ModalPagosMixtos.jsx | Medios seleccionables, importes, recibido, vuelto, referencias, verificación y salida protegida. |
| utils/pagos-mixtos.js | Evaluación exacta, validación y construcción de un comando permitido. |
| services/pagos.service.js | Consulta cancelable de contexto y validación de ID BIGINT, sin escrituras. |
| App.jsx y layouts/AdminLayout.jsx | Ruta y navegación protegidas. |
| styles/sistema.css | Tarjetas por medio, resumen, diseño adaptable y temas. |

El paquete preparado contiene `pedidoId` (para la ruta), `version`,
`sesion_caja_id` y `pagos`. No contiene total editable, impuesto, vuelto enviado,
precio de productos ni datos de autenticación. Los pagos contienen
`metodo_pago` y `monto_pagado`; efectivo añade `monto_entregado`; digital añade
`referencia_operacion` y `verificado`; canje añade `puntos`. El vuelto mostrado
es auxiliar: lo recalcula el servidor al cobrar.

La captura solo vive en memoria. No persistir referencias bancarias, puntos o
preparaciones de pago en localStorage. El carrito continúa con su persistencia
independiente; nunca se vacía por preparar una distribución.

La fase 30 deberá adquirir/revalidar checkout, recuperar versión vigente, usar
clave de idempotencia y enviar el cuerpo sin `pedidoId` a la ruta del pedido.
Una respuesta perdida requiere recuperar esa misma operación; no generar otra
clave ni limpiar el carrito ante un resultado desconocido. Hasta entonces el
botón se llama «Preparar distribución», no «Cobrar».

## Accesibilidad y pruebas

Reutiliza el diálogo nativo con foco contenido, encabezado enfocable, Escape
controlado y retorno de foco. Campos y errores vinculados por ID, medios con
`aria-pressed`, resumen `aria-live` y controles táctiles. Los campos permanecen
montados mientras se calculan importes. Grilla de medios de dos/tres columnas;
sin desbordamiento horizontal a 320 px y con desplazamiento vertical del diálogo.

Desde frontend:

```powershell
npm.cmd run test:pagos
npm.cmd run test:pagos:navegador
npm.cmd run lint
npm.cmd run build
```

La prueba de navegador requiere Vite en `http://localhost:5173` y Edge instalado.
Usa API simulada: Yape40+efectivo60/recibido100/vuelto40, invalidación al editar,
descarte protegido, reapertura, actualización, referencias sin persistencia,
permisos, cuenta pagada, 404, foco, temas y anchos 320/390/768/1366 px. Comprueba
que preparar no cobra y la confirmación registra una sola venta. Cinco pruebas puras cubren precisión,
límites, canje y compatibilidad del paquete con el validador del backend.

Desde backend, `npm.cmd run test:pedidos:integracion` verifica con HTTP/MySQL
el contexto, permisos y ausencia de nuevas ventas/idempotencias por consultarlo,
además de las regresiones comerciales de la fase 28.
