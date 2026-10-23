# Fase 33 - Mapa de mesas

Ruta `/salon`, menú **Salón y mesas**, permiso `mesas/gestionar` en cliente y
servidor. Lo tienen administrador y mesero según los datos iniciales existentes;
no se modificaron roles, permisos ni migraciones.

## Uso y alcance

1. Elegir zona: se muestra su nombre, aforo registrado y número de mesas.
2. Revisar los contadores de libres, ocupadas, por limpiar e inhabilitadas.
   Los contadores corresponden a toda la zona; los filtros afectan al resultado
   mostrado y no al resumen. Un estado nulo se informa aparte y nunca cuenta
   como libre. Un aforo o capacidad sin valor positivo se muestra sin definir.
3. Buscar por código, seleccionar estado o activar **Solo mis mesas**.
   La asignación se compara con el ID de sesión, no con el creador de un pedido.
   Se muestra el empleado mediante su identificador; no se consulta el listado
   de usuarios ni se exponen correos o datos de seguridad.
4. Alternar **Mapa** y **Lista**. Mapa normaliza X/Y al panel visible; no es un
   plano arquitectónico a escala. Las posiciones no se editan ni persisten.
   Se calcula con toda la zona: filtrar no cambia la posición de las otras mesas.
5. Cuando faltan posiciones, coinciden, quedarían superpuestas o el panel mide
   menos de 500 px, se muestra una cuadrícula y se explica el motivo. En celular
   se usan tarjetas con los mismos detalles y controles, sin desplazamiento
   horizontal. La vista Lista siempre presenta esas tarjetas.
6. Seleccionar una mesa abre un diálogo nativo con código, zona, estado,
   capacidad, mesero asignado y coordenadas originales. Admite teclado y Escape.
7. **Actualizar mesas** obtiene otra consulta. Mantiene filtros y presentación
   mientras carga, sin desmontar el mapa. Un fallo muestra un error y permite
   reintentar; no transforma una desconexión en cierre de sesión.

La hora de consulta se presenta en Lima. Esta fase no tiene actualización en
tiempo real, arrastre ni comandos para ocupar, liberar, limpiar o reasignar.
Las transiciones y relación con pedidos abiertos se completarán en fase 34,
revisando los efectos ya existentes de creación y cobro de pedidos.

La base local revisada al cerrar esta fase no tenía zonas ni mesas. No se
inventaron zonas, cantidades o coordenadas del local: la pantalla muestra el
estado vacío hasta que se configure la distribución real. Los ejemplos de las
pruebas son temporales y no quedan registrados.

## Contrato de consulta

`GET /api/salon` requiere sesión HttpOnly y `mesas/gestionar`. No admite query
params. Devuelve `consultado_en` UTC, `zonas` y `mesas`. Se seleccionan únicamente:

| Recurso | Campos |
| --- | --- |
| `zonas_restaurante` | `id`, `nombre`, `aforo_maximo` |
| `mesas_salon` | `id`, `zona_id`, `codigo_mesa`, `capacidad_sillas`, `estado_actual`, `mesero_asignado_id`, `posicion_x`, `posicion_y` |

Estados exactos: `libre`, `ocupada`, `sucia_por_limpiar`, `inhabilitada`; SQL
también permite null y el cliente lo muestra como sin estado registrado.
Respuesta `Cache-Control: no-store`. Las dos consultas comparten una transacción
REPEATABLE READ para evitar mezclar zonas y mesas de instantes diferentes.
No se crean pedidos, cambian mesas ni disparan eventos de escritura.

Sin sesión devuelve 401; sin permiso 403; parámetros inesperados 400. No hay
rutas POST, PATCH o DELETE en este recurso. El cliente valida IDs, códigos,
pertenencia a zona, tipos y estados antes de mostrar el conjunto; una respuesta
incoherente falla completa para evitar presentar disponibilidad parcial.

## Archivos y funciones

| Ruta relativa a CODIGO | Responsabilidad |
| --- | --- |
| `backend/src/services/salon.service.js` | `consultarSalon`: lectura coherente y proyección mínima de las tablas existentes. |
| `backend/src/routes/salon.routes.js` | Autenticación, permiso, rechazo de parámetros y respuesta HTTP. Registrado en `backend/src/app.js`. |
| `frontend/src/pages/Salon.jsx` | Estado de zona, filtros, contadores, detalle y consulta; contexto reiniciado al cambiar de usuario. |
| `frontend/src/components/salon/MapaMesas.jsx` | `MapaMesas`: observar ancho y distribuir. `TarjetaMesa`: botón accesible con estado y detalle. |
| `frontend/src/utils/salon-mapa.js` | `validarSalon`, `filtrarMesas`, `contarMesas`, `distribuirMesas`, `etiquetaEstado`: contrato, filtros, resumen y detección de superposición. |
| `frontend/src/services/salon.service.js` | Consulta HTTP cancelable y validación de respuesta. |
| `frontend/src/App.jsx`, `layouts/AdminLayout.jsx`, `components/ui/Icono.jsx`, `styles/sistema.css` | Ruta, menú, icono propio y estilo responsive claro/oscuro. |
| `frontend/tests/salon-mapa.test.mjs` | Contrato, filtros, null, coordenadas extremas, colisiones y fallback. |
| `frontend/tests/salon-navegador.mjs` | Flujo de interfaz, actualizaciones, accesibilidad, errores y permisos con API simulada. |
| `backend/tests/salon-integracion.mjs` | HTTP/MySQL real local, autenticación, roles, proyección, estados y lectura sin cambios. |

Se reutilizan `useConsultaRemota`, cliente API, sesión, layout, botones, diálogo
nativo e iconos. No se añadieron librerías ni persistencia local de mesas.

## Validación reproducible

Desde frontend, con Vite activo en localhost:5173 para las pruebas de navegador:

```powershell
npm.cmd run test:salon
npm.cmd run test:salon:navegador
npm.cmd run lint
npm.cmd run build
```

El navegador usa Edge y Playwright del runtime Codex; se puede pasar la ruta
del módulo como primer argumento a `node tests/salon-navegador.mjs` y un prefijo
de capturas como segundo. Se prueban 320, 390, 768 y 1366 px en ambos temas,
sin superposiciones ni overflow, foco en diálogo, teclado, filtros sin HTTP,
cero escrituras, actualización sin parpadeo, error sin logout y respuesta inválida.

Desde backend, con MySQL local configurado:

```powershell
npm.cmd run test:salon:integracion
```

Crea y retira sus propios usuarios, zonas y mesas. Comprueba zona vacía, todos
los estados y null, asignación, coordenadas, no-store, 401/403/400 y rechazo de
escrituras. No ejecutar integración contra producción.

README actualizados. Resumen PDF fuera del repo: `DOCUMENTACION/FASES/FASE_33.pdf`.
