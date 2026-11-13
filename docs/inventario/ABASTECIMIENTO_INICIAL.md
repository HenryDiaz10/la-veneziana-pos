# Abastecimiento inicial — 6 de noviembre de 2026

> Rutas y comandos: salvo indicación expresa, las rutas de código y los comandos de esta guía son relativos a `backend/`, no a la carpeta del documento.

Carga autorizada por el propietario, con cantidades y costos estimados por el
asistente. No se aportaron facturas externas. La numeración `CI-20261106-001`
a `CI-20261106-006` es **interna**, no emitida por las empresas registradas.
La web muestra las compras con su numeración interna y estado confirmado.
El origen estimado se conserva en esta documentación, el CSV y la auditoría.

## Documentos e importes

| Documento | Proveedor | Insumos | Neto S/ | IGV S/ | Total S/ |
|---|---|---:|---:|---:|---:|
| CI-20261106-001 | Carnicería Don Mateo [FICTICIO] | 5 | 832.00 | 149.76 | 981.76 |
| CI-20261106-002 | Alicorp | 7 | 491.00 | 88.38 | 579.38 |
| CI-20261106-003 | San Fernando | 11 | 1,134.00 | 204.12 | 1,338.12 |
| CI-20261106-004 | Gloria | 4 | 240.00 | 43.20 | 283.20 |
| CI-20261106-005 | Arca Continental Lindley | 13 | 1,641.60 | 295.49 | 1,937.09 |
| CI-20261106-006 | Makro | 85 | 4,097.75 | 737.60 | 4,835.35 |
| **Total** | | **125** | **8,436.35** | **1,518.55** | **9,954.90** |

IGV de 18% solicitado por el propietario, aplicado al subtotal neto de cada
documento y redondeado una vez a céntimos. Es un supuesto de esta carga; no
es una verificación del tratamiento tributario de cada insumo o emisor.
Los costos unitarios están expresados **sin IGV por kg, litro o unidad**.

Las 6 compras ingresan 111 ingredientes y 14 bebidas envasadas al Kardex,
actualizan stock físico y costo promedio mediante los servicios existentes.
No se compran pizzas/platos terminados: se abastecen sus ingredientes.
Ejemplos: 50 kg harina, 25 kg mozzarella, 30 kg papa, 25 kg arroz, 180 huevos,
36 envases por presentación de agua/gaseosa y 48 cervezas.
No se agrega Cielo al menú; AJEPER queda disponible como proveedor sin compra
en este lote porque la carta usa San Luis.

Inicialmente el estado de pago quedó pendiente. Después, por instrucción del
propietario, las seis compras se marcaron **pagado_total** mediante una declaración
administrativa auditada del 06/11/2026: S/9,954.90 saldados y S/0.00 pendientes.
No se especificó banco, caja de origen ni comprobante de desembolso; no se inventan.
Las compras sí participan en los reportes de esta base local; su origen estimado
no cambia ni acredita una operación bancaria o factura externa real.
Las reservas anteriores, pedidos, precios de venta e imágenes se conservan.

El reporte gerencial incorpora **Compras y proveedores** con importe registrado,
total de documentos saldados y saldo pendiente. Filtra por fecha de emisión del
documento y muestra su estado de pago actual; no por fecha efectiva de desembolso.
Este bloque es global y no sigue el filtro de sesión ni el estado de las ventas.
Si hay documentos parcialmente pagados, el saldo se muestra como no disponible
porque el esquema todavía no contiene el desglose monetario de esos abonos.
Las compras no se restan otra vez como gastos del margen: el consumo de insumos
ya tiene su costo histórico en las ventas. El CSV gerencial incluye este bloque.

## Revisión de contribución

Se evaluaron 206 bases/presentaciones del catálogo, incluidas las mermas de las
recetas y las alternativas de modificadores. Para cada grupo se eligió la
alternativa de menor contribución; para opcionales múltiples se acumularon
las opciones que la reducen. Las opciones rentables se pueden añadir sin
empeorar ese escenario. No se toman cantidades arbitrarias del navegador.

Todas conservan contribución positiva con estos costos propuestos. El escenario
conservador compara venta de carta / 1.18 contra ingredientes con 18% añadido,
sin recuperar crédito fiscal. Es una hipótesis para revisar cobertura de costos,
no una modificación de la política tributaria de ventas ni una garantía de
ganancia neta. Aún deben cubrirse personal, alquiler, energía, delivery y otros
gastos. No se redujeron precios ni porciones para producir ese resultado.

Detalle: [cantidades y costos](../../backend/data/compras-iniciales.csv) y
[contribuciones por presentación](../../backend/data/margenes-abastecimiento.csv).
Los insumos comprados listos para usar (agua, hielo, pan, pulpas, jugos, etc.)
tienen un costo estimado en esa presentación; no se generan subrecetas de producción.

## Implementación y pruebas

- `data/compras-iniciales.mjs`: 125 cantidades, costos netos y proveedores.
- `src/services/compras-iniciales.service.js`: documentos, cálculo decimal de
  IGV, cobertura, lote repetible y transacción única para todas las compras.
- `src/services/compras-iniciales-margen.js`: revisión decimal de contribución.
- `scripts/cargar-compras-iniciales.mjs`: herramienta local y exportación CSV.
- `compras.service.js`: guardar/confirmar acepta una transacción externa opcional;
  conserva el comportamiento previo para las solicitudes de la API.
- `tests/compras-iniciales*.mjs`: cantidades, impuesto, cobertura, ingreso completo,
  precios conservados, repetición sin duplicados y rollback de documentos/Kardex/saldos.

Desde `CODIGO/backend`:

```powershell
npm.cmd run compras:iniciales:validar
npm.cmd run test:compras:iniciales
npm.cmd run test:compras:iniciales:integracion
npm.cmd run compras:iniciales:cargar
npm.cmd run compras:iniciales:saldar
npm.cmd run test:compras:iniciales:pago
```

Herramienta limitada a MySQL local de desarrollo. Repetir la carga no duplica
existencias ni documentos; si las líneas, proveedores o documentos difieren,
se rechaza. El lote queda registrado en `COMPRAS_ABASTECIMIENTO_INICIAL_V1`.
Si cambian los insumos activos, se debe revisar la cobertura antes de otra carga.
La prueba de integración revierte su trabajo y no deja compras adicionales.
