# Frontend de La Veneziana

Interfaz web del sistema de la pizzería, construida con React y Vite.

## Estado actual

La pantalla de login está conectada al backend mediante cookies HttpOnly.
Zustand conserva la identidad en memoria y recupera la sesión al recargar;
no se guardan tokens ni contraseñas en localStorage.

Utiliza el logo original, vidrio, colores compartidos, Inter, Montserrat
y Playfair Display locales, foco visible y efectos con movimiento reducido.
Se puede ingresar, consultar la identidad y cerrar la sesión. React Router
protege /inicio por sesión y /seguridad por seguridad/gestionar. La consulta
inicial debe terminar antes de mostrar las páginas. Sin sesión se redirige
a /login; sin permiso se muestra acceso restringido. El backend mantiene
la autorización real en cada solicitud. Las pantallas del negocio siguen
pendientes.

Seguridad consulta los roles existentes sin modificarlos. Las rutas
desconocidas muestran Página no encontrada. Después del login se recupera
el destino interno solicitado; con sesión activa no se vuelve al formulario.

## Componentes compartidos

components/ui contiene BotonBase, BotonSecundario (dorado), BotonPeligro
(rojo oscuro) y Badge. Los botones admiten carga y deshabilitado y respetan
movimiento reducido; las etiquetas ofrecen variantes neutro, exito,
advertencia y peligro. Inicio reutiliza las etiquetas y los layouts el botón
dorado para cerrar sesión.

En desarrollo, /componentes permite revisar sus estados con una sesión
que tenga seguridad/gestionar. Sus controles solo modifican un mensaje
local y no operan sobre datos del negocio. La ruta no se registra en
producción. Los layouts incorporan el selector claro/oscuro de la fase 17;
el login mantiene su presentación oscura propia.

## Layouts y temas (fase 17)

- `src/layouts/AdminLayout.jsx`: cabecera, identidad, selector, logout y menú
  lateral con opción activa dorada. En móvil se abre mediante un botón y se
  cierra al navegar o con Escape, devolviendo el foco al botón.
- `src/layouts/PosLayout.jsx`: cabecera con usuario y rol, selector y logout;
  sin menú lateral, con contenido proporcionado mediante Outlet.
- `src/pages/PuntoVenta.jsx`: estructura de productos y carrito, apilados en
  móvil y en dos columnas desde lg. Catálogo, pedidos y cobro siguen pendientes.
- `src/components/SelectorTema.jsx`: botón que alterna el tema y anuncia la
  siguiente apariencia mediante su nombre accesible.
- `src/stores/tema.store.js`: inicializarTema aplica la preferencia al arrancar;
  cambiarTema valida y aplica el valor; alternarTema cambia entre claro y oscuro.
  Persiste únicamente la preferencia visual en localStorage bajo
  `la-veneziana-tema`, con claro como valor predeterminado. Si falla el guardado,
  el cambio permanece activo durante la visita.
- `src/theme.css`: variables app-* adaptables y foco visible para ambos temas.
  Los colores de marca de los botones conservan su contraste.

App integra los layouts bajo ProtectedRoute: /inicio requiere sesión;
/seguridad y /componentes requieren seguridad/gestionar; /pos requiere
ventas/cobrar. El menú muestra enlaces según esos permisos. Las páginas
Inicio, Seguridad y Componentes usan secciones dentro del main del layout.
La consulta de roles y la autenticación por cookie mantienen su funcionamiento.

ESLint y build pasaron al cierre. El usuario aportó capturas de administración
en claro y oscuro y del POS oscuro, y confirmó la revisión del tema persistente,
la disposición móvil y el menú. No se instalaron dependencias en esta fase.

## Tabla de datos (fase 18)

`src/components/ui/DataTable.jsx` presenta filas alternadas y hover con los
colores app-* de ambos temas. Utiliza Inter y tabular-nums para las celdas
numéricas. No realiza consultas ni añade dependencias.

- Obligatorios: titulo, columnas y filas. Proporcionar al menos una columna,
  con clave única y titulo. Cada fila necesita id único o una función
  obtenerClave que devuelva una clave estable.
- Opciones de columna: alineacion (izquierda, centro o derecha), numerica
  y renderizar(fila) para personalizar una celda.
- Estados: cargando, error y mensajeVacio. La carga tiene prioridad; las filas
  permanecen ocultas durante carga o error. Los valores nulos se muestran
  como un guion y se conserva el cero.

Incluye caption, scope=col, región desplazable con nombre accesible y foco,
aria-busy y mensajes status/alert. El desplazamiento horizontal queda dentro
de la tabla. No incorpora filtros, ordenación, paginación, virtualización ni
exportación: la página consumidora debe gestionar las consultas y el volumen.

En /componentes, filasEjemplo y columnasEjemplo muestran datos ficticios y
precios PEN con Intl.NumberFormat de es-PE. estadoTabla permite probar registros,
carga, vacío y error sin llamar al backend. La galería sigue restringida a
desarrollo y seguridad/gestionar.

ESLint y build pasaron. Se corrigió la integración JSX que dejaba cinco
variables sin uso; la captura del usuario muestra alternancia en oscuro,
cantidades y precios alineados y cero visible. Los demás estados, el tema claro
y la presentación móvil pueden revisarse con el selector de la galería.

## Instalación

Ejecutar desde la carpeta CODIGO/frontend:

```powershell
# Instalamos las versiones registradas en package-lock.json.
npm.cmd ci
```

## Desarrollo

```powershell
# Iniciamos el servidor de desarrollo.
npm.cmd run dev
```

Abrir http://localhost:5173.

Preparar el .env a partir de .env.example si no existe, conservando cualquier
configuración local previa. Usar VITE_API_URL=/api. El proxy de Vite reenvía
/api al backend de http://127.0.0.1:3000, que debe estar ejecutándose.
CORS_ORIGIN del backend debe coincidir con http://localhost:5173.
Las mutaciones incluyen X-CSRF-Protection: 1 y las solicitudes envían cookies.
Reiniciar Vite después de cambiar la configuración.

En producción, publicar /api bajo el mismo origen con HTTPS para utilizar
la cookie Secure. El proxy de desarrollo no se aplica a los archivos compilados.
El alojamiento debe servir index.html para las rutas del frontend, sin
interceptar /api, para admitir aperturas directas con BrowserRouter.

El puerto está fijado en 5173. Si está ocupado, Vite muestra un error
en lugar de utilizar otro puerto.

Para detener el servidor, presionar Ctrl + C. Si Windows pregunta
si se desea terminar el trabajo por lotes, responder S.

## Verificación del código

```powershell
# Revisamos el código mediante ESLint.
npm.cmd run lint

# Generamos la versión de producción.
npm.cmd run build
```

El resultado de la compilación se guarda en dist.
Este comando no publica la aplicación en internet.

## Organización

- index.html: documento HTML, idioma, título y elemento raíz.
- src/main.jsx: inicia React e importa los estilos generales.
- src/App.jsx: componente principal de la aplicación.
- src/index.css: estilos básicos.
- vite.config.js: integración con React y servidor de desarrollo.
- eslint.config.js: reglas de revisión del código.

node_modules y dist están excluidos de Git.

## Estilos y fuentes

- src/theme.css: colores y familias tipográficas compartidos.
- src/index.css: Tailwind, estilos generales y foco visible.
- Inter y Montserrat: fuentes locales mediante Fontsource, con
  font-display: swap y fuentes de respaldo.
- public/licenses/: licencias originales de ambas fuentes, incluidas
  también en la compilación.

La pantalla inicial se revisó a 390 × 844, 320 × 800 y 768 × 1024,
además de la ampliación del navegador al 200 %.

Se comprobó el acceso al contenido mediante teclado y el foco visible.
Estas pruebas deberán repetirse en las futuras pantallas de negocio.

Las interacciones de los botones y los efectos del login respetan
prefers-reduced-motion.

## Configuración de la API

Crear `.env` tomando como referencia `.env.example`.

En desarrollo, usar `VITE_API_URL=/api`; el proxy de Vite reenvía las
solicitudes a `http://127.0.0.1:3000`.
Reiniciar Vite después de modificar la configuración.

`src/config/env.js` valida la dirección antes de mostrar la
aplicación. Si es inválida, aparece “Sistema no disponible”.
Esta validación no comprueba que el backend esté encendido.

`.env.production.example` documenta `/api` para una publicación
conjunta. Los archivos terminados en `.example` no se cargan
automáticamente.

Las variables `VITE_` quedan disponibles en el frontend:
no colocar contraseñas ni secretos en ellas.

## Clientes: interfaz de fase 20

Ruta `/clientes`, protegida por `clientes/buscar` y disponible en el menú y
los accesos del Inicio. La búsqueda exige documento o teléfono completo;
no carga el padrón general ni guarda filtros personales en la URL o localStorage.

- `src/pages/Clientes.jsx`: búsqueda paginada, selección y edición del cliente.
- `src/services/clientes.service.js`: consultas y guardado mediante el cliente API.
- `src/hooks/useConsultaClientes.js`: cancela solicitudes y descarta respuestas
  anteriores al cambiar de consulta; recupera la sesión ante HTTP 401.
- `src/components/clientes/FormularioDatosCliente.jsx` y `validacion.js`:
  formularios de cliente/dirección con errores asociados, captura conservada,
  documento según tipo y bloqueo de envíos duplicados.
- `src/components/clientes/PerfilCliente.jsx`: contacto, actividad, nivel VIP,
  saldo oficial, direcciones y movimientos de puntos paginados.
- `src/components/clientes/PaginacionClientes.jsx`: navegación de cada listado.
- `src/styles/clientes.css`: presentación adaptable en ambos temas.

Crear/editar clientes y direcciones requiere `clientes/gestionar`. Los roles
con búsqueda conservan una ficha de consulta y direcciones sin acciones de
escritura. El historial administrativo de puntos también exige gestionar.
Nivel VIP y puntos son de consulta: las reglas de ganancia/canje se integrarán
con las operaciones de venta; esta interfaz no concede bonos ni cambia niveles.
La dirección principal se coordina en el backend sin borrar direcciones previas.

Validación de esta interfaz: lint/build, alta y edición mediante navegador,
cambio de documento con actualización del filtro de la ficha, dirección
principal y edición, conflicto de documento conservando captura y foco,
consulta de historial, permisos de cajero y diseño a 390/320 px sin que la
página desborde. Pruebas HTTP/MySQL del historial: filtros exactos, 401/403,
campos limitados, aislamiento de clientes, paginación y saldo sin cambios.

## Constructor de recetas: fase 22

Ruta `/recetas`, permiso `catalogo/gestionar`. Entrada desde menú, Inicio o
Catálogo (platos preparados). La URL puede seleccionar `producto` y `variante`;
el servidor verifica sus IDs y la relación entre ambos.

- `pages/Recetas.jsx`: selección, consulta, recarga y aviso de cambios pendientes.
- `components/recetas/SelectorRecursoReceta.jsx` y `SelectorVarianteReceta.jsx`:
  búsqueda paginada de productos/insumos y selección de receta base o variante.
- `EditorReceta.jsx`: captura completa, copia de base, validación y guardado.
- `FilaIngrediente.jsx`: cantidad bruta/neta, unidad y merma con errores asociados.
- `VistaPreviaReceta.jsx`: equivalencias, bruto, neto estimado y rendimiento.
- `utils/recetas.js`: cálculo exacto con BigInt, conversión compatible y redondeo
  final a cuatro decimales; validación completa antes de preparar la petición.
- `services/recetas.service.js` y `hooks/useConsultaRemota.js`: API, cancelación
  de consultas obsoletas y comprobación de sesión ante 401.
- `styles/recetas.css`: presentación adaptable y compatible con ambos temas.

La API recibe siempre bruto en kg, L o un. En captura neta se calcula
`bruto = neto / (1 - merma/100)`. Ejemplo: 200 g netos con 20 % de merma
equivalen a 0.2500 kg brutos. Al reabrir se usa bruto; no se duplica la merma.
Una receta de variante sustituye a la base y se guarda independientemente.

Se conservan campos tras un error; se impiden duplicados, recetas vacías y
envíos repetidos. `main.jsx` usa `createBrowserRouter`/`RouterProvider` para
que `useBlocker` proteja también Atrás/Adelante. `useBeforeUnload` solicita
confirmación nativa ante recarga o cierre con cambios pendientes.

Comprobaciones: `npm.cmd run lint`, `npm.cmd run test:recetas` (cuatro pruebas)
y `npm.cmd run build`; navegador para guardado/reapertura, variantes, rechazo
del servidor conservando captura, navegación, cajero sin acceso y móvil
390/320 px. No se editan saldos ni se crean consumos desde este constructor.

## Monitor de inventario: fase 24

Ruta `/inventario`, permiso `inventario/gestionar`, accesos en menú e Inicio.
`pages/Inventario.jsx` muestra saldos oficiales por insumo, búsqueda con espera
de 300 ms, filtros, indicadores y paginación. Los indicadores corresponden a
todos los resultados de la búsqueda, antes de filtrar por alerta; pueden
coincidir quiebre con stock bajo o sin disponible.

`components/inventario/DetalleInventario.jsx` muestra físico, reservado,
disponible, mínimo, historial de movimientos y conciliación. Las diferencias
no cambian saldos. La conciliación supone saldo inicial cero; una apertura
debe quedar respaldada por Kardex. Las consultas usan un snapshot consistente
por respuesta, con fecha de consulta y actualización manual.

`services/inventario.service.js` consulta los endpoints protegidos.
`components/inventario/presentacion.js` conserva cuatro decimales como texto,
etiquetas de movimiento y fecha en hora de Lima. `styles/inventario.css`
adapta el buscador a ambos temas; DataTable mantiene el desplazamiento de
las tablas dentro de su panel en móviles. `useConsultaRemota` cancela consultas
anteriores, permite reintentar y recupera la sesión ante 401.

Catálogo incorpora Stock para productos directos y usuarios con permiso.
Abre `/inventario?producto=ID`; el servidor resuelve su insumo asociado.
El detalle de un insumo se puede abrir con `?insumo=ID`. Los IDs de la URL
se validan y las respuestas anteriores se descartan al cambiar de selección.
No se usa `stock_actual` del producto ni hay campos de edición de saldos.

Comprobaciones: ESLint/build, búsqueda, filtros de alerta, detalle, conciliación,
enlace Stock, cajero sin acceso ni enlace y presentación claro/oscuro y móvil
390/320 px sin desbordamiento de la página. Datos de prueba temporales retirados.

## Compras y proveedores: fase 25

Ruta `/compras`, permiso `inventario/gestionar`. Menú e Inicio incorporan el
acceso. `pages/Compras.jsx` alterna documentos y proveedores, busca con espera
de 300 ms y pagina resultados; los documentos pueden filtrarse por estado.

- `components/compras/FormularioMaestroCompra.jsx`: proveedor/insumo con campos
  acotados, bloqueo de doble envío y captura conservada al fallar o cancelar
  el descarte. Un insumo nuevo siempre nace con saldo cero.
- `SelectorCompra.jsx`: búsqueda paginada de proveedores/insumos, deshabilita
  inactivos, incompatibles e insumos repetidos.
- `FormularioCompra.jsx`: documento y líneas, unidades base, IGV como importe,
  preview exacto y guardado de borrador con UID estable ante reintentos.
- `DetalleCompra.jsx`: consulta, edición de borrador, confirmación explícita,
  vínculo a Inventario y compensación completa con aprobación administrativa.
- `services/compras.service.js`: API protegida y solicitud de aprobación para
  la compra concreta, con identidad de la sesión.
- `utils/compras.js`: operaciones BigInt, redondeo por línea y total estimado.
- `styles/compras.css`: campos, líneas y selectores en ambos temas.

Las cantidades/costos son por kg, L o un, hasta cuatro decimales. No se convierte
g/ml aquí. El costo de almacén se captura neto de descuentos y sin IGV recuperable;
IGV se registra por separado. El servidor recalcula todos los importes.

El borrador no mueve stock. Confirmar ingresa todo y cierra la edición; reintentar
no duplica ingresos. La compensación requiere documento y motivo, respeta
reservas y conserva la factura original. Solo usuarios con permiso de aprobación
ven esta acción administrativa. No se editan estados de pago al proveedor.

Comprobaciones: lint/build, `npm.cmd run test:compras` (dos pruebas), captura
inválida conservada, alta/confirmación de un borrador temporal y consulta del
ingreso/conciliación en Inventario, seguir editando tras aviso de descarte,
diseño claro/oscuro, 390/320 px y cajero sin acceso. Pruebas HTTP/MySQL del backend
cubren duplicados, revisiones obsoletas, concurrencia, compensación y rollback.
