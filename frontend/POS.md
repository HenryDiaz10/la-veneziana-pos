# Fase 27: interfaz operativa del punto de venta

Revisada y corregida el 17/10/2026. La ruta `/pos` se integra en `AdminLayout`,
con navegación por permisos, temas claro/oscuro y borrador separado por empleado.

## Componentes y responsabilidades

| Archivo en src/ | Responsabilidad |
|---|---|
| `pages/PuntoVenta.jsx` | Coordina catálogo, personalización, titularidad y vistas móviles. |
| `components/pos/CatalogoPos.jsx` | Categorías, búsqueda, imágenes alternativas y selección de producto. |
| `components/pos/ModalPersonalizarProducto.jsx` | Consulta precios/opciones actuales; valida variantes, grupos y cantidades enteras de 1 a 10000. |
| `components/carrito/IndicacionesProducto.jsx` | Campo de indicaciones por preparación, compartido entre POS y edición del borrador. |
| `components/pos/ReciboTermico.jsx` | Lista completa de líneas y extras, edición, cantidades, eliminación, vaciado confirmado y revisión. |
| `components/pos/ModalBebidaPos.jsx` | Recupera envases activos de una marca y reutiliza personalización, cantidad y validación. |
| `utils/bebidas-pos.js` | Agrupa visualmente Coca-Cola, Inca Kola y San Luis por SKU explícito, conservando IDs reales. |
| `components/pos/BarraMovilPedido.jsx` | Pestañas y total compartido en móvil; evita superponer la barra al escribir. |
| `hooks/useResumenPos.js` | Consulta productos distintos una vez; comparte la estimación entre recibo y barra móvil. |
| `hooks/useConsultaRemota.js` | Carga cancelable y reintento; descarta respuestas obsoletas. |
| `services/pos.service.js` | Cliente de rutas operativas; distingue producto retirado de fallos de conexión. |
| `styles/pos.css` | Paneles en escritorio y vistas completas en móvil, textos largos y controles táctiles. |

Los cálculos reutilizan `utils/carrito-calculo.js` y `utils/carrito-estimacion.js`:
céntimos BigInt, grupos obligatorios, exclusividad y bloqueo de total ante líneas
inválidas. El store y `SincronizadorCarrito` mantienen persistencia sin credenciales.

El caldo de gallina exige elegir pecho (pechuga) o pierna, sin recargo, mediante
su grupo de modificadores. Cada línea puede incluir indicaciones opcionales de
hasta 250 caracteres; se conservan al editar, cambiar cantidades y recargar y
se muestran junto a la presa tanto en el recibo del borrador como en su revisión.
Distintas preparaciones permanecen separadas. El comando futuro incluye el texto,
pero todavía no se crea ni envía una comanda a cocina.

Pruebas de esta ampliación: `npm.cmd run test:indicaciones` y
`npm.cmd run test:cocina:navegador` (Vite activo en el puerto 5173).

## Backend y permisos

`GET /api/pos/catalogo` y `GET /api/pos/productos/:id` requieren sesión y
`ventas/cobrar`. No conceden `catalogo/gestionar` al cajero ni exponen costos o
insumos. Un producto activo de categoría desactivada también queda excluido y
su detalle devuelve 404. La búsqueda usa `LOCATE`: `%` y `_` se tratan como texto.

Archivos: `backend/src/routes/pos.routes.js`, `controllers/pos.controller.js` y
`services/pos.service.js`.

## Correcciones de la revisión

- Los reintentos estaban desconectados; ahora renuevan la solicitud y su estado.
- El total móvil mostraba `--`; ahora usa el mismo total exacto del recibo.
- El diálogo conservaba precios/opciones antiguos al editar; ahora usa la respuesta actual.
- Se evita convertir silenciosamente cantidades vacías, decimales o fuera de rango en otra cantidad.
- Se conserva visualmente la presentación base con ID propio al editar.
- Se muestran completos los extras y se ajustan textos/importes largos; controles principales de 44 px.
- Se retiró el IGV fijo y el selector de pagos llamado auditado sin registro real.
- La revisión se bloquea durante carga, error o total inválido; no se muestra cero como sustituto de un total desconocido.
- Se eliminó el acceso de prueba `window.__useCartStore`; el navegador prueba la persistencia por su flujo normal.
- Se corrigió texto con caracteres de control y comandos corruptos en el README principal.

## Comprobaciones reproducibles

Desde frontend:

```powershell
npm.cmd run lint
npm.cmd run build
node --test tests/carrito.test.mjs tests/pos.test.mjs tests/bebidas-pos.test.mjs
node tests/pos-navegador.mjs <ruta-a-playwright/index.mjs>
```

El último comando requiere Vite en `http://localhost:5173`, Edge y Playwright.
El argumento permite usar una instalación local de Playwright. Sin argumento usa
la ruta del entorno original. `POS_EVIDENCIA_DIR` permite guardar capturas fuera
del repositorio. No usa cuentas reales: intercepta API en un contexto aislado.

Se comprobaron: cajero sin acceso administrativo, filtros, variantes, precios
actualizados, cantidades inválidas, reintentos en catálogo/diálogo/recibo, F5,
aislado por empleado, 30 líneas, diez extras con nombres largos e importe grande,
320/390/768/1280 px, rotación, ambos temas, producto retirado y vaciado confirmado.
Las pruebas unitarias verifican cálculos; el desbordamiento visual se verifica
en navegador. Se comprueba que el POS no envía escrituras de pedidos/pagos/stock.

Desde backend, con MySQL local de desarrollo disponible:

```powershell
npm.cmd run test:pos:integracion
```

Crea y limpia sus propios registros temporales. Verifica 401 sin sesión, 403 sin
permiso, separación administrativa, rutas operativas, variantes, extras,
categorías desactivadas y búsqueda literal con `%`.

## Alcance y comprobación pendiente

Esta fase prepara y revisa borradores. No confirma pedidos ni pagos, reserva
stock, aplica tasas fiscales o imprime comprobantes. El servidor deberá validar
selecciones y precios al implementar el registro transaccional posterior.

El navegador comprueba foco de entrada, diálogo con altura reducida y rotación.
El comportamiento de un teclado virtual nativo aún debe comprobarse en un
teléfono físico; la emulación de escritorio no demuestra ese comportamiento.
El PDF original de fase 27 describe la entrega previa de Antigravity; esta revisión
corrige las afirmaciones sobre IGV y pagos auditados en la documentación vigente.

## Bebidas agrupadas por marca

Coca-Cola, Inca Kola y San Luis tienen una tarjeta por marca. El selector muestra
el precio completo de cada tamaño; la presentación elegida corresponde a su SKU
e ID reales, con stock e historial independientes. El selector recupera todos
los envases activos aunque la búsqueda original fuera un volumen o SKU concreto.
La edición permite cambiar el tamaño dentro de la misma marca conservando cantidad.
Las variantes normales de pizzas y otros productos mantienen su comportamiento.

Comprobaciones añadidas: cuatro pruebas unitarias de agrupación, presentaciones,
búsqueda, IDs de carrito e importes; navegador real con Coca-Cola 1 litro por dos
unidades (S/16), cambio a 500 ml (S/9), persistencia F5, gordita exclusiva de Inca
Kola y San Luis 625 ml/1 litro. El diálogo se comprobó también a 320 px.
