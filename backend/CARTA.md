# Carga de la carta real de La Veneziana

Fuente: `DOCUMENTACION/CARTA/VENEZIANA CARTA.pdf`, 14 páginas, revisadas
visualmente porque la mayor parte del contenido son imágenes.
La carga fue solicitada expresamente por el propietario y aplicada a MySQL local.

## Resultado

| Categoría | Productos |
| --- | ---: |
| Pizzas | 19 |
| Adicionales | 5 |
| Panes | 5 |
| Hamburguesas | 4 |
| Sopas | 3 |
| Platos criollos | 16 |
| Pastas | 5 |
| Frozen | 9 |
| Tragos y cervezas | 14 |
| Bebidas frías | 13 |
| Bebidas calientes | 4 |
| **Total** | **97** |

También se registraron 109 variantes/presentaciones, seis grupos con trece
opciones y 38 vínculos a productos, incluyendo la elección de presa del caldo.
Los precios de cada presentación constan
en `data/carta-precios.csv`, con la página de origen para revisar el PDF.

La pizza súper especial de cecina quedó en **S/21 personal, S/32 mediana y
S/41 familiar**, según confirmación explícita del propietario. El PDF muestra
S/42 en la tabla y S/41 en una nota; prevalece la indicación del propietario.
La descripción conserva los ingredientes comunes: el PDF discrepa entre
chorizo en la nota y hot dog en la tabla, sin inventar una receta definitiva.

## Presentaciones y elecciones

- Las pizzas tienen precio base personal y adicionales exactos para mediana
  y familiar. Salchipizza y Bordecitos de Ternura se ofrecen solo en familiar,
  a S/55, como figura en la carta.
- Cachitos se vende en paquete de tres por S/1. Los panes rellenos respetan
  peso y precio por unidad/docena. Manjar blanco y chocolate figuran por separado.
- Frozen: 1/2 litro S/9 y 1 litro S/17.
- Los tragos siguen la tabla general de copa S/15, medio litro S/23 y litro
  S/42. Los señalados expresamente “copa y 1/2” no incluyen litro; Calientito
  queda en taza S/15. Cerveza S/9 y Corona margarita S/28 son artículos separados.
- Hamburguesas: proteína carne/pollo cuando corresponde y queso cheddar/edam
  sin recargo. La de lomo fino conserva esa proteína. Broaster permite presa
  y arroz opcional. Los adicionales de papas S/8, ensalada S/6 y huevo S/2
  se ofrecen tanto como productos como opciones de platos a la carta.
- Marcas confirmadas por el propietario: Inca Kola y Coca-Cola. Ambas tienen personal,
  500 ml, 1 litro, 1.5 litros y 3 litros; gordita es exclusiva de Inca Kola.
  Se mantienen los precios de la carta por presentación. Agua San Luis: 625 ml S/3
  y 1 litro S/5. Cada envase se controla como artículo separado para su stock.

## Inventario y delivery

Catorce bebidas envasadas tienen su insumo directo por unidad, con físico y
reservado inicial **cero**. No se crearon compras, Kardex, reservas ni saldos
ficticios. Para tener existencias se debe registrar el ingreso real en Compras.
No se inventaron cantidades de ingredientes ni recetas de cocina.

Las quince tarifas de delivery se conservaron en la configuración
`CARTA_TARIFAS_DELIVERY` y en la página pública de referencia
`/tarifas-delivery-carta.html`, enlazada desde el POS. No son productos de
comida ni se añaden automáticamente al precio del pedido.

## Imágenes

56 fotos referenciales con URLs HTTPS y créditos. Los nueve frozen tienen fotos
distintas por sabor y los 14 tragos/cervezas tienen una imagen individual.
Las gaseosas tienen fotos de su propia marca y el agua es
San Luis. Otras familias de la carta conservan sus imágenes por familia.
Las fuentes son Wikimedia Commons y páginas de marca/distribuidor. No son fotografías de las preparaciones del local.
Las fuentes, autores y licencias están en `data/carta-imagenes.json` y en
`/creditos-imagenes-carta.html`, enlazado visiblemente desde el catálogo POS.
Las imágenes se verificaron por HTTP y se revisaron visualmente; se reemplazaron
resultados poco adecuados. La atribución usa los autores publicados en cada fuente.

## Archivos y repetición segura

- `data/carta-veneziana.mjs`: transcripción, precios, presentaciones y tarifas.
- `data/carta-imagenes.json`: URLs y créditos; no contiene credenciales.
- `scripts/importar-carta.mjs`: valida el manifiesto, registra en una transacción,
  usa SKU `CARTA-*` y slug para evitar duplicados y deja auditoría de la importación.
- `scripts/buscar-imagenes-carta.mjs`: recupera metadatos/licencias de las fotos seleccionadas.
- `scripts/verificar-imagenes-carta.mjs`: comprueba tipo de contenido y descarga de las URLs.
- `tests/carta.test.mjs`: integridad de la transcripción y formatos admitidos.
- `tests/carta-web.mjs`: navegador real con cajero temporal y limpieza de su sesión/usuario.
- Frontend: catálogo con créditos/delivery y fotos marcadas como referenciales;
  selector y resumen identifican la presentación base por su nombre.

Desde `CODIGO/backend`:

```powershell
npm.cmd run carta:validar
npm.cmd run carta:importar
npm.cmd run test:carta
```

La validación no escribe en MySQL; genera CSV y páginas públicas de referencia.
La importación repetida devolvió **cero altas/cambios**, sin duplicados. No
sobrescribe precios, imágenes ni existencias editadas después de la carga.
Para actualizar solo las imágenes de artículos `CARTA-*` de forma explícita:

```powershell
node scripts/importar-carta.mjs --aplicar --actualizar-imagenes
```

## Comprobaciones realizadas

- 97 productos activos y once categorías visibles en el servicio POS real.
- Cecina: base S/21, adicional mediana S/11, adicional familiar S/20.
- La carga inicial creó nueve insumos sin saldo; la corrección de marcas añadió cinco,
  también sin saldo. Se preservan los saldos reales que ya existieran y no se generan movimientos de Kardex.
- Cuatro pruebas de carta y catorce pruebas existentes del frontend aprobadas.
- ESLint y compilación de producción aprobados.
- Integración HTTP/MySQL del POS aprobada, incluyendo 401/403, cajero operativo,
  administración protegida, variantes y modificadores; fixtures retirados.
- Navegador contra el backend real: catálogo de 97 productos, imagen remota
  descargada, cecina familiar S/41, recuperación con F5, 390 px sin desborde y
  página de delivery. Usuario y sesión temporales eliminados al terminar.

La carga de catálogo no completa recetas ni habilita el registro definitivo
de pedidos/cobros de fases posteriores. Los precios del borrador siguen siendo estimados.

## Corrección de bebidas confirmada por el propietario

La actualización conserva los SKU e IDs de las seis gaseosas genéricas para
Inca Kola, sus vínculos y saldos. Añade cinco artículos Coca-Cola, cada uno con
su insumo independiente y saldo inicial cero. Se corrigen nombres de agua y
sus insumos propios; no se alteran precios ni existencias previas. No se inventa
el volumen de las presentaciones denominadas personal o gordita en la carta.

Para repetir de forma idempotente desde backend:

```powershell
node scripts/importar-carta.mjs --aplicar --actualizar-imagenes --actualizar-bebidas
```

`--actualizar-bebidas` limita los cambios de nombre/descripción al agua y a las
seis gaseosas originales. `--actualizar-imagenes` actualiza solo fotos. Ambos
requieren `--aplicar` para escribir en MySQL. Auditoría conserva los nombres
anteriores y nuevos. Las fotos son referenciales: el envase fotografiado puede
diferir de volumen; la presentación y el precio los indica la ficha del producto.
Maracumango usa una foto referencial de batido de mango, sin atribuirle una receta.

Pruebas: `node --test tests/carta.test.mjs` comprueba imágenes únicas de frozen,
marcas y precios. `node tests/bebidas-carta-integracion.mjs` aplica esta corrección
real autorizada, conserva IDs/saldos y comprueba una segunda ejecución sin cambios;
no es una prueba descartable de fixtures. `tests/carta-web.mjs` comprueba los 97
productos, imágenes de nueve frozen, marcas, agua S/3, cecina S/41 y vista móvil.

## Imágenes individuales de tragos

Se reemplazaron once asignaciones de fotos compartidas por fotografías distintas
para maracuyá sour, algarrobina, durazno, chilcano, chilcano de maracuyá, sangría,
piña colada, Espuma de pitufo, Laguna azul, Pantera rosa y Corona margarita.
Pisco sour, cerveza y calientito conservan sus fotos, diferentes del resto de
esta categoría. Las 14 bebidas tienen URLs únicas y se comprobaron por descarga
y en el navegador. No se cambiaron precios, presentaciones, recetas o saldos.

La foto de Pantera rosa corresponde al cóctel homónimo; Corona usa su receta
oficial y chilcano de maracuyá una fotografía de Jamea Perú. Para Espuma de pitufo
se usa como referencia visual un cóctel Blue Hawaiian y para durazno un Peach
Shrub. Son imágenes referenciales; no documentan la receta propia del local.
Los archivos, autores, fuentes y condiciones se conservan en
`data/carta-imagenes.json` y en la página pública de créditos.

El recuperador de metadatos divide sus consultas en lotes para respetar el límite
de títulos de Wikimedia y falla si falta un archivo, evitando guardar un catálogo
incompleto. Las pruebas de carta impiden repetir imágenes dentro de frozen o de
tragos/cervezas; el escenario de navegador comprueba que se descarguen realmente.

## Tarjetas por marca y selector de envase en el POS

El POS muestra una sola tarjeta para Coca-Cola, una para Inca Kola y una para
Agua San Luis. Los 97 artículos de la carta se presentan en 87 tarjetas. Al abrir
una marca, se consultan los envases activos de su categoría, sin restringirlos
por la búsqueda anterior. Cada opción muestra su precio completo y al elegirla
se consulta otra vez el producto real para validar precio/configuración.

Coca-Cola ofrece cinco tamaños; Inca Kola seis, incluida gordita; San Luis ofrece
625 ml S/3 y 1 litro S/5. Cambiar el tamaño en la edición conserva la cantidad.
El borrador persiste el ID real del envase, no el ID de la tarjeta agrupada.
No se fusionan registros, insumos, stock ni historial. Administración conserva
los envases separados. Los productos con SKU distintos de los explícitamente
reconocidos siguen como tarjetas individuales, sin agruparse por nombre.

Archivos frontend: `utils/bebidas-pos.js`, `components/pos/ModalBebidaPos.jsx`,
`ModalPersonalizarProducto.jsx`, `ReciboTermico.jsx` y `pages/PuntoVenta.jsx`.
Pruebas: `npm.cmd run test:bebidas` desde frontend y escenario real
`tests/carta-web.mjs` desde backend: tres tarjetas, tamaños, precios completos,
cambio de tamaño, IDs reales, F5, búsqueda por SKU y diálogo a 320 px.

### Elección de presa para caldo de gallina

`CARTA-SOP-GALLINA` se vincula al grupo obligatorio de selección única
«Presa del caldo de gallina»: «Pecho (pechuga)» o «Pierna», ambas sin recargo.
El grupo es independiente de la presa de broaster y no se aplica a las otras
sopas. No se alteran precios, insumos, existencias ni registros históricos.
El importador registra el grupo, dos opciones y un vínculo de forma idempotente.

El POS añade además indicaciones libres por línea en el borrador, conservadas
en la edición, persistencia y revisión. El envío real de comandas queda pendiente
del módulo de pedidos/cocina; no se simula un envío ni disponibilidad por presa.
