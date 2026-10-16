# Fase 27: Interfaz Operativa del Punto de Venta (POS)

La ruta `/pos` proporciona la interfaz de ventas para el perfil Cajero, construida con React, Tailwind CSS y Zustand. Está protegida exclusivamente por sesión activa y el permiso operativo `ventas/cobrar`.

---

## 1. Arquitectura y Componentes

- **`pages/PuntoVenta.jsx`**:
  Controlador principal de la pantalla dividida. Orquesta el catálogo de productos, el recibo térmico financiero, el modal de personalización y la navegación adaptable para móviles. Sincroniza las selecciones con `useCartStore` y verifica la titularidad del borrador por empleado.

- **`components/pos/CatalogoPos.jsx`**:
  Panel del catálogo con selector horizontal de categorías activas (píldoras con colores oficiales), barra de búsqueda en tiempo real (nombre, SKU o código de barras) y cuadrícula de tarjetas de productos. Incluye imágenes con alternativa visual de respaldo (fallback de marca), precios base destacados y botones de adición directa. Maneja estados de carga, error con reintento y catálogo vacío.

- **`components/pos/ModalPersonalizarProducto.jsx`**:
  Diálogo accesible para configurar variantes (presentación base o adicionales) y grupos de modificadores (extras, bordes, exclusiones). Valida grupos obligatorios y selecciones únicas/múltiples en tiempo real. Permite ajustar cantidades (1 a 10000) con control incremental y muestra el precio unitario y subtotal estimado calculado con céntimos BigInt.

- **`components/pos/ReciboTermico.jsx`**:
  Panel financiero con estética de recibo térmico digital. Muestra líneas numeradas, nombres completos con ajuste de texto sin desbordes, variantes, etiquetas de modificadores (hasta 10 por línea), controles de cantidad (`+`/`−`), edición y eliminación. Calcula subtotal e IGV estimado (18% informativo). Incluye selector de métodos de pago de referencia (Efectivo, Tarjeta, Yape, Plin), botón para actualizar precios, vaciado con confirmación y botón maestro de cobro acotado a la fase actual.

- **`components/pos/BarraMovilPedido.jsx`**:
  Navegación optimizada para tabletas y teléfonos (< 1024px, 390px, 320px). Proporciona pestañas superiores para alternar entre Catálogo y Recibo con un toque, y una barra flotante inferior con el total y acceso directo al pedido para evitar carritos laterales estrechos o ilegibles.

- **`services/pos.service.js`**:
  Cliente HTTP para los endpoints operativos del POS. Consulta catálogo y productos utilizando únicamente el permiso `ventas/cobrar`. `consultarDatosBorradorPos` recupera los productos distintos del borrador de manera atómica y cancelable, señalando productos dados de baja sin exponer datos administrativos.

- **`styles/pos.css`**:
  Reglas de diseño visual: grilla CSS de 12 columnas (8 catálogo / 4 recibo térmico en escritorio), tarjetas de productos, panel térmico, scrollbars estilizados, píldoras de pago y clases adaptables para modos claro y oscuro.

---

## 2. Separación de Permisos y Endpoints Operativos

El cajero no tiene asignado el permiso administrativo `catalogo/gestionar`. Por ello, la Fase 27 incorpora un contrato operativo específico:

| Endpoint | Permiso Requerido | Propósito |
|---|---|---|
| `GET /api/pos/catalogo` | `ventas/cobrar` | Lista categorías activas y productos disponibles para la venta. Filtra por categoría y búsqueda. |
| `GET /api/pos/productos/:id` | `ventas/cobrar` | Devuelve datos de venta del producto, sus variantes activas y grupos de modificadores con opciones. |
| `GET /api/productos` | `catalogo/gestionar` | Consulta administrativa del catálogo (restringida al administrador). Devuelve 403 al cajero. |

- Las consultas operativas devuelven exclusivamente campos requeridos para la venta (`id`, `nombre`, `precio_venta_base`, `descripcion`, `imagen_url`, `tipo_producto`). No exponen costos, insumos directos ni configuraciones de almacén.
- Los productos o categorías marcados como inactivos quedan automáticamente excluidos del POS.
- Si un producto guardado en el borrador deja de estar disponible, `GET /api/pos/productos/:id` responde 404, impidiendo calcular un total parcial engañoso.

---

## 3. Reglas Financieras y Límites Entre Fases

1. **Cálculo Monetario Exacto:**
   Los cálculos se realizan con enteros BigInt en céntimos compartidos de la Fase 26 (`carrito-calculo.js` y `carrito-estimacion.js`), evitando imprecisiones de coma flotante de `Number`.
2. **Importes Estimados:**
   Todo precio mostrado en el navegador es una estimación. La venta definitiva, validación fiscal de tasas y comprobación de disponibilidad serán responsabilidad del servidor en la Fase 28.
3. **Ausencia de Movimientos de Inventario:**
   Añadir productos al carrito no descuenta ni reserva stock. Las reservas y consumos corresponden a los servicios de inventario cuando se envía a cocina o se confirma el pedido.
4. **Límite de Fase 27:**
   No se registran ventas reales, aperturas de caja Z, impresión térmica en hardware físico ni transacciones bancarias. El botón maestro de cobro presenta un modal informativo confirmando la preparación de la interfaz y delimitando el paso a la Fase 28.

---

## 4. Comprobaciones y Pruebas

- **Pruebas Unitarias Frontend:**
  `npm.cmd run test:pos` ejecuta 7 pruebas automáticas en `tests/pos.test.mjs`:
  - 10 modificadores en una línea con cálculo exacto.
  - 30 líneas con nombres largos e importes grandes sin desborde.
  - Importes extremos (S/ 99,999.00).
  - Conservación de cantidades al editar.
  - Validación de grupos obligatorios y grupos simples.
  - Comando DTO sin precios del cliente.
  - Bloqueo de total ante productos dados de baja.

- **Prueba de Navegador Automatizada:**
  `node tests/pos-navegador.mjs` ejecuta con Playwright en Edge headless:
  - Cajero autorizado sin permisos administrativos.
  - Catálogo, filtros por categoría y búsqueda.
  - Modal con variantes y modificadores.
  - Recibo térmico, cantidades y edición.
  - Persistencia F5 en localStorage aislado por empleado.
  - Carga y visualización de 30 líneas.
  - Responsividad: 1280px (escritorio), 768px (tableta), 390px (móvil) y 320px (móvil compacto).
  - Rotación de pantalla en pedido activo (390x844 a 844x390).
  - Modos claro y oscuro.
  - Modal informativo del límite con la Fase 28.
  - Vaciado confirmado y verificación de 0 errores de consola.

- **Prueba de Integración Backend:**
  `npm.cmd run test:pos:integracion` en la carpeta `backend` ejecuta contra MySQL:
  - 401 sin sesión.
  - 403 usuario sin `ventas/cobrar` (cocinero).
  - 403 cajero intentando acceder a la API administrativa.
  - 200 cajero en `/api/pos/catalogo` y `/api/pos/productos/:id`.
  - Exclusión de categorías y productos inactivos.
  - Limpieza completa de registros temporales.
