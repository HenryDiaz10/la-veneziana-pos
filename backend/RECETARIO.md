# Recetario referencial de la carta

Solicitud del propietario, noviembre de 2026. Cubre los 97 productos de la
carta: 83 preparados con 192 recetas completas (83 bases y 109 variantes) y
14 bebidas envasadas que consumen una unidad de su insumo directo.

## Referencia de pizzas

| Presentación | Harina | Mozzarella normal | Salsa de tomate |
|---|---:|---:|---:|
| Pequeña / Personal | 200 g | 100 g | 15 g (1 cucharada estimada) |
| Mediana | 300 g | 140 g | 30 g (2 cucharadas estimadas) |
| Familiar | 400 g | 200 g | 45 g (3 cucharadas estimadas) |

Harina y queso son las cantidades indicadas por el propietario. Se interpretó
la tercera referencia de harina «L 200 g» como pequeña/personal. Una cucharada
se estimó en 15 g; debe pesarse la cuchara real. Para la masa se estimó agua al
60% de la harina, levadura seca al 1%, sal al 2% y aceite de oliva al 3%.

Los toppings personales tienen porciones individuales en el CSV; mediana usa
1.5 veces y familiar 2 veces. Ejemplo americana: jamón 30/45/60 g y aceituna
15/22.5/30 g. Hawaiana: piña 30/45/60 g y durazno 25/37.5/50 g. Se incluyen
todos los sabores de la carta, con sus carnes, verduras y quesos correspondientes.
Las pizzas de doble queso duplican la mozzarella; Bordecitos familiar agrega
80 g para el borde (480 g totales). Salchipizza y Bordecitos son familiares.

Gordo Jeu ofrece una opción sin recargo de piña y durazno: 30 g + 25 g por pizza,
una porción adicional fija independientemente del tamaño. No se consume si
no se selecciona. La carta no especifica su precio ni su peso; ambos son
supuestos iniciales revisables con el propietario.

## Otras preparaciones y opciones

- Panes: paquete de cachitos de tres unidades; rellenos según sabor y peso;
  docenas consumen doce recetas unitarias. Pan al ajo representa diez rebanadas
  de una baguette comprada, con mantequilla, ajo y perejil.
- Hamburguesas: base sin proteína ni queso seleccionables; Carne/Pollo añaden
  100 g y Cheddar/Edam 20 g. La de lomo fino lleva 100 g de res en su base.
- Caldo: pecho o pierna de gallina agrega 250 g con hueso. Broaster: pechuga o
  pierna de pollo agrega 250 g. Arroz opcional agrega 80 g crudos y sus insumos;
  «Sin arroz» no agrega consumo. No se duplican las proteínas elegidas.
- Criollos, sopas, pastas y guarniciones tienen fórmulas por porción. Arroz y
  fideos se expresan en peso seco; las pastas frescas se descomponen en harina,
  huevo, agua y sal. Las salsas de pasta se descomponen en ingredientes.
- Frozen: fórmula de medio litro y doble para un litro, con la fruta de cada
  sabor; la chicha se descompone en maíz morado, agua, fruta y especias.
- Cócteles: copa nominal estimada de 250 ml; medio litro y litro multiplican
  por dos y cuatro. Son fórmulas iniciales, no rendimientos medidos: ajustar
  hielo, dilución y volumen servido. Corona margarita incluye una botella.
- Calientes: café, leche, infusión, agua y azúcar según bebida. La jarra de
  infusión de un litro usa cuatro porciones de hierbas.
- Papas, ensalada y huevo como adicionales consumen la misma receta tanto
  al venderse solos como al elegirse dentro de un plato.

## Unidades, existencias y revisión

Los 111 insumos se almacenan en kg, litros o unidades, a cuatro decimales.
Frutas/carnes sin hueso se registran limpias; presas se pesan con hueso.
Los objetivos originales se convierten a consumos brutos con merma estimada
de manipulación: **bruto = neto / (1 - merma / 100)**. No se aplica otra vez al
reservar ni al consumir. Huevo fraccionado sirve para
prorratear mezclas por porción, no exige romper esa fracción al preparar.
Aceite representa una asignación estimada de consumo, no toda la freidora.
Salsa de tomate, pan comprado, cremas, pulpas y jugos se controlan como insumos
listos para usar; no hay producción automática de subrecetas de esos productos.

### Merma de referencia incorporada

| Insumos listos para usar | Merma estimada |
|---|---:|
| Frutas y verduras ya limpias, hierbas frescas | 5% |
| Carnes, presas con hueso y salsas espesas | 3% |
| Harina, quesos, embutidos y otros sólidos | 2% |
| Líquidos, jugos, leche y aceite | 1% |
| Agua, hielo, sal, azúcar y artículos por unidad | 0% |

Ejemplo familiar: 200 g netos de mozzarella requieren 204.1 g brutos con 2%.
Los toppings y opciones también incluyen su merma una sola vez. Las cantidades
originales pasan a ser objetivos netos; el CSV muestra objetivo, bruto y porcentaje.
Son estimaciones de adherencia/derrame/manipulación de insumos ya acondicionados;
no suman otra pérdida por cáscaras, huesos ni reducción durante cocción.
El rendimiento físico de insumos comprados enteros se debe medir y ajustar.

La variación de porcionado (servir más o menos) no es una merma automática ni
aleatoria. La receta descuenta un estándar; diferencias reales se concilian
mediante los movimientos/ajustes de inventario existentes. Huevos/envases no
reciben consumos fraccionarios por supuestas roturas. El campo **Merma esperada**
de cada ingrediente es editable. Si se ingresa una cantidad neta, el editor
calcula el bruto; si se ingresa bruta, no lo aumenta de nuevo.

**Validar pesos, rendimiento, sazón y composición con cocina antes de adoptar
estas estimaciones como estándar definitivo.** Se conserva el origen referencial
en la pantalla Recetas. Cada base y variante puede editarse desde la web.

Los insumos se crearon con stock físico, reservado y costos **cero**. La carga
no acredita existencias: registrar compras/ingresos reales antes de operar.
Hasta entonces puede aparecer falta de disponibilidad y el costo es incompleto.
Posteriormente se autorizó el [abastecimiento inicial](ABASTECIMIENTO_INICIAL.md)
con cantidades y costos estimados para los 125 insumos/bebidas. Esos ingresos
permiten probar los pedidos con existencias y costos; no acreditan compras reales.
No cambia precios, imágenes, pedidos anteriores ni sus recetas congeladas.

## Archivos y ejecución

- `data/carta-recetas.mjs`: fórmulas comentadas, catálogo de ingredientes,
  escalado de tamaños, opciones y criterios de referencia.
- `data/recetas-carta.csv`: detalle completo por producto/presentación/opción,
  con cantidades en unidades base. Abrir como CSV UTF-8 separado por punto y coma.
- `src/services/carta-recetas-importacion.js`: valida cobertura y carga en una
  transacción; rechaza recetas existentes diferentes y unidades incompatibles.
- `scripts/cargar-recetas-carta.mjs`: CLI local, validación previa y exportación.
- `tests/carta-recetas*.mjs`: cobertura de la carta, proporciones, alternativas,
  repetición sin duplicados y protección de saldos/ediciones en MySQL con rollback.

Desde `CODIGO/backend`:

```powershell
npm.cmd run recetas:carta:validar
npm.cmd run test:recetas:carta
npm.cmd run test:recetas:carta:integracion
npm.cmd run recetas:carta:cargar
npm.cmd run recetas:carta:mermas
```

Repetir la carga idéntica no duplica datos. Si una receta ya fue editada, la
carga se cancela completa; ajustar desde Recetas.
La opción `--merma` actualiza únicamente recetas que coinciden exactamente con
la carga inicial; cualquier edición distinta cancela toda la transacción.
Repetirla no acumula merma. Las opciones usan deltas brutos porque su tabla no
contiene un campo porcentual. Los porcentajes están en `data/carta-mermas.mjs`.

La configuración
`CARTA_RECETAS_REFERENCIA_V1` registra origen y huella; la auditoría registra la
carga sin credenciales. No ejecutar esta herramienta contra producción.
