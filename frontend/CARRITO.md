# Fase 26: carrito y estimación

La ruta `/pruebas-carrito` existe solo en desarrollo y exige
`catalogo/gestionar`. Permite buscar productos reales, seleccionar presentación
base o variante y extras, añadir una selección o treinta líneas, editar,
cambiar cantidades, quitar y vaciar con confirmación.

## Archivos y funciones

- `stores/useCartStore.js`: normaliza selecciones; añade líneas o lotes
  atómicos, actualiza, elimina y vacía. Máximo 100 líneas y cantidad 1–10000.
- `utils/carrito-calculo.js`: céntimos BigInt, sin sumar dinero con Number.
- `utils/carrito-estimacion.js`: valida producto, variante, grupos obligatorios
  y exclusivos; estima cada línea y total. `construirComandoCarrito` prepara
  únicamente selecciones para el futuro pedido, sin importes del navegador.
- `utils/carrito-persistencia.js`: formato versionado, UUID, límites y lista
  explícita de campos. Devuelve avisos ante corrupción, cuota o bloqueo.
- `components/SincronizadorCarrito.jsx`: recupera tras confirmar la sesión,
  suscribe cambios después de cargar y retira la memoria al cerrar sesión.
- `services/carrito.service.js`: consulta todas las páginas de variantes,
  grupos y opciones; recupera una configuración por producto distinto.
- `components/carrito/SelectorProductoCarrito.jsx`: añadir/editar selección
  conservando cantidad; corrige extras o variantes retiradas.
- `components/carrito/ResumenCarrito.jsx`: nombres e importes actuales,
  edición en diálogo, cantidades y vaciado confirmado. Las consultas se
  cancelan al desmontar; cambiar cantidad no vuelve a descargar el catálogo.
- `pages/PruebasCarrito.jsx`: escenario de comprobación protegido en desarrollo.
- Backend: `GET /api/productos/:id`, bajo sesión y `catalogo/gestionar`,
  en router/controlador/servicio de productos existentes. Rehidrata productos
  fuera de la página visible sin recorrer todo el catálogo.

## Persistencia y precios

La clave local es `la-veneziana-carrito-v1:<usuarioId>`. Guarda solo versión y
líneas con `id`, `productoId`, `varianteId`, `modificadoresIds` y `cantidad`.
No conserva precios, sesión, tokens, contraseñas ni datos del cliente.
El borrador permanece local al cerrar sesión, para su propietario; las claves
separadas evitan mezclar empleados, pero no constituyen cifrado del equipo.

El catálogo se consulta al recuperar el borrador, al incorporar productos
distintos y con **Actualizar precios**. Productos inactivos, eliminados u
opciones retiradas se señalan; no se calcula un total parcial como si fuera
completo. Una consulta fallida permite reintentar y mantiene las selecciones.

Todo importe mostrado es **estimado**. No se confirma una venta, reserva stock
ni se habilita cobro. El servidor del futuro pedido tendrá que validar
selecciones, disponibilidad y precios y devolver el total definitivo. La
interfaz operativa del POS corresponde a la fase 27.

## Verificación

`npm.cmd run test:carrito`: ocho pruebas de importes/límites, comando sin
precios, campos permitidos, treinta líneas con variante/cantidad editadas y
recuperación, lotes atómicos, reglas de grupos, cambios de catálogo, corrupción
y almacenamiento bloqueado. No utiliza base de datos.

`tests/carrito-navegador.mjs`: escenario reproducible con Playwright, Edge
headless, Vite en localhost:5173 y un contexto aislado. Ejecutar con
`node tests/carrito-navegador.mjs` si Playwright está disponible, o pasar como
primer argumento la ruta a su `index.mjs`. No es una dependencia de producción.
Intercepta las respuestas de API: treinta líneas, variante y cantidad editadas,
F5, precios actualizados, producto retirado, otro empleado, logout y vista
390 px en ambos temas. No crea fixtures en MySQL ni utiliza sesiones reales.

También se verificaron ESLint, compilación, sintaxis de los módulos backend
modificados y respuesta HTTP 401 real de la consulta puntual sin sesión.
El escenario de navegador no sustituye una prueba autenticada contra MySQL.
