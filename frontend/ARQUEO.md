# Fase 32 - Arqueo de caja

Ruta `/caja`, menú **Arqueo de caja**, permiso `caja/gestionar`.
La API valida sesión propia y permisos; ocultar botones no sustituye esa validación.

## Uso

1. Consultar el turno actual o una sesión propia por número. Sin turno abierto
   se puede abrir una caja disponible con el componente de apertura existente.
2. Revisar apertura, efectivo aplicado, ingresos, egresos y devoluciones.
   Los pagos digitales y la equivalencia de puntos se muestran separados.
3. Registrar movimientos con motivo; un egreso exige aprobación `caja/egreso`.
   Un usuario con `seguridad/gestionar` puede autorizar desde el modal; el
   resto introduce una autorización obtenida por el procedimiento existente.
   Cambiar importe o concepto invalida la aprobación capturada en el formulario.
4. Contar directamente o por billetes/monedas, con un campo para otros importes.
   Una caja vacía se confirma escribiendo cero. No se aceptan cantidades
   fraccionarias de piezas ni redondeo silencioso de importes.
5. Revisar y marcar confirmación antes de cerrar. Se envían únicamente conteo,
   observaciones y revisión. El backend calcula el teórico y el descuadre,
   bloquea el turno y guarda un snapshot inmutable por los servicios.
6. Si la revisión cambió, actualizar y revisar de nuevo. Si se perdió la
   respuesta, usar el aviso de recuperación con la misma identidad, también
   después de F5. No repetir el cierre con otra clave.
7. Consultar el cierre guardado, preparar copias numeradas y consultar su trabajo
   de impresión. Se puede abrir un turno nuevo sin editar el cierre anterior.

Actualizar mantiene el formulario montado y conserva conteo/observaciones
incluso ante un error temporal. Estos borradores viven en memoria y se pierden
al recargar antes de enviar. La recuperación de un cierre enviado conserva
solo identidad y metadatos de navegación; no guarda su cuerpo, observaciones,
autorizaciones ni credenciales en localStorage. No borra el carrito.

## Archivos y responsabilidades

| Archivo | Función |
| --- | --- |
| `src/pages/ArqueoCaja.jsx` | Consultar, revisar, confirmar, recuperar y presentar cierre e impresión. Reiniciar contexto al cambiar de usuario. |
| `src/components/caja/ConteoEfectivo.jsx` | Formulario controlado de conteo, denominaciones y observaciones. |
| `src/components/caja/ModalMovimientoCaja.jsx` | Capturar ingreso/egreso y aprobación, guardar con idempotencia. |
| `src/utils/arqueo-calculo.js` | `calcularConteo`: céntimos exactos; `prepararCierre`: validar propuesta; `idSesionValido`: validar selección. |
| `src/services/caja.service.js` | Consultar sesión/resumen y comprobar estructura mínima y sesión de respuesta. |
| `src/stores/comercial.store.js` | Ampliar journal a movimientos, cierre y copias; validar recurso confirmado sin tocar carrito. |
| `src/components/RecuperarOperacion.jsx` | Recuperación global y enlace al área de caja o pagos. |
| `src/App.jsx`, `src/layouts/AdminLayout.jsx`, `src/styles/sistema.css` | Ruta protegida, menú y diseño claro/oscuro adaptable. |

En laptop, resumen y conteo aparecen en columnas. En celular, el conteo precede
al detalle. Se reutilizan botones, modal nativo, apertura, iconos, tema y consultas
remotas existentes; se conservan foco, teclado y estados accesibles.

## Pruebas

Desde frontend:

```powershell
npm.cmd run test:arqueo
npm.cmd run test:arqueo:navegador
npm.cmd run test:comercial:navegador
npm.cmd run test:cocina:navegador
npm.cmd run test:pagos:navegador
npm.cmd run test:sesion:navegador
npm.cmd run lint
npm.cmd run build
```

Las pruebas de navegador usan Vite en `http://localhost:5173`, Edge y el módulo
Playwright del runtime Codex; puede pasarse su ruta como primer argumento a
los scripts `.mjs`. Las API se simulan para comprobar errores y respuestas
perdidas de forma reproducible. Se probaron 320, 390, 768 y 1366 px en ambos
temas, permisos, foco, revisión obsoleta, conservación del conteo, aprobación,
cierre perdido, recarga sin duplicación, copias, carrito intacto y turno nuevo.
La integración HTTP/MySQL y las reglas oficiales están en `backend/CAJA.md`.

No se implementa aquí una interfaz de devoluciones ni reapertura de cortes.
La impresión es simulada, sin confirmar papel físico ni abrir cajón.
Siguiente: fase 33, salón y mesas. PDF fuera de Git: `DOCUMENTACION/FASES/FASE_32.pdf`.
