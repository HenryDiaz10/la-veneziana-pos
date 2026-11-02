# Fase 37 - Cocina y despacho

Abrir `/cocina` desde el menú, con sesión y permiso `kds/operar`. Se reutiliza
AdminLayout, Modal nativo, autenticación, cliente API y tema claro/oscuro.
Sin dependencias nuevas. Arranque: `npm.cmd run dev` en backend y frontend.

## Operación

Tarjetas por tarea/componente con cantidad, producto, variante, pedido, destino,
opciones/exclusiones, indicaciones y fechas oficiales. Cada componente mantiene
su identidad, aunque provenga de la misma línea. No crea ni duplica ventas.
Filtrar área, etapa o producto/pedido/mesa no realiza escrituras.

En pantallas grandes: cuatro etapas; en laptop: dos columnas; en móvil: lista
vertical. Selector de etapa y botones de 44 px permiten operar con tacto y
teclado, sin depender de arrastre. Confirmar en diálogo accesible antes de enviar.
Listo para entregar no significa entregado.

- Cocina: espera -> preparando -> horno opcional -> listo_para_entrega -> entregado.
- Despacho: espera -> entregado. Consume la bebida al confirmar entrega.
- Cancelar tarea exige motivo. Antes de iniciar libera la reserva. Después,
  exige ID de autorización vigente aprobada por administración para ese actor
  y esa tarea; conserva el consumo histórico. Ver contrato backend.
- Cancelar preparación **no anula ni descuenta la línea comercial**, no devuelve
  dinero ni repone stock. Una devolución es otro flujo autorizado.

## Estado oficial y recuperación

WebSocket nativo usa la URL de API configurada, con ws/wss y cookie HttpOnly,
sin credenciales en URL. Primero suscribir y cargar la colección paginada.
Los avisos recibidos durante la carga obligan a repetir el snapshot; sus UIDs
se deduplican en un conjunto acotado a 2000 entradas. Un aviso es invalidación,
no estado aplicable. Recuperar una colección completa también elimina terminales.

Reconexión con demora exponencial limitada a 30 s, nueva colección al conectar,
consulta de respaldo cada 30 s y al recuperar foco/visibilidad/conexión. Si WS
falla pero HTTP funciona se indica «Consulta periódica». No se promete latencia.
Las consultas fallidas conservan las tarjetas para lectura y bloquean acciones;
fallos temporales no producen logout. 401 comprueba sesión; 403 bloquea acceso.

Cada comando captura ID, versión, cuerpo y UUID. Se guarda **antes** del POST
en sessionStorage separado por empleado. No almacena JWT, cookies ni contraseñas.
Incluye el motivo/ID de aprobación cuando corresponde, no credenciales de aprobación.
Red/5xx dejan el intento pendiente: el botón reenvía exactamente la misma clave y
cuerpo, también después de F5 en la misma pestaña. No se permite otra operación
hasta resolverlo. Un 409 obliga a consultar la versión oficial antes de confirmar
de nuevo. Respuestas iniciadas antes de un comando confirmado no lo revierten.
Cerrar la pestaña elimina sessionStorage: revisar el estado oficial antes de actuar.

## Archivos y funciones

| Archivo relativo a frontend | Finalidad |
| --- | --- |
| `src/pages/TableroKds.jsx` | Etapas, contadores, filtros, confirmación y cancelación. |
| `src/components/kds/TarjetaKds.jsx` | Cantidad, destino, indicaciones, exclusiones, fechas y acciones. |
| `src/hooks/useTableroKds.js` | Conexión, snapshots serializados, invalidaciones, reconexión y envío recuperable. |
| `src/services/kds.service.js` | URL WS, colección por cursores y POST protegido con clave. |
| `src/utils/kds-tablero.js` | Validación, acciones, destino y mezcla por versión/ID. |
| `src/utils/kds-intento.js` | Leer/guardar/quitar identidad propia del comando en la pestaña. |
| `src/styles/kds.css` | Tema, tarjetas, columnas y adaptación. |
| `src/App.jsx`, `src/layouts/AdminLayout.jsx` | Ruta y enlace por permiso real. |
| `tests/kds.test.mjs`, `tests/kds-navegador.mjs` | Reglas de presentación, recuperación, permisos, eventos y tamaños. |

## Validación

`npm.cmd run test:kds`, `npm.cmd run test:kds:navegador` (con Vite activo),
`npm.cmd run lint` y `npm.cmd run build`. Navegador usa API/WS simulados y datos
sintéticos, sin modificar negocio: paginación, filtros, confirmación sin cambio
optimista, respuesta perdida/F5, reconexión, fallos sin logout, permiso y anchos
320/390/768/1366/1920 en ambos temas. Backend verifica HTTP/WS y MySQL reales
en su prueba propia. Capturas revisadas visualmente en laptop y móvil.

Resumen: `DOCUMENTACION/FASES/FASE_37.pdf` fuera del repositorio CODIGO.
Fase 38 incorporará reloj compartido, avisos y audio con consentimiento por gesto.
Esta fase muestra timestamps; no incorpora alarma ni deduce productos quemados.
