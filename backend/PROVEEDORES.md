# Proveedores de referencia

Alta solicitada por el propietario. Datos públicos consultados el 06/11/2026.
Se registran **seis empresas reales y una carnicería ficticia**, visibles en
**Compras y proveedores → Proveedores** y al elegir proveedor de una compra.

| Razón social | RUC | Referencia de abastecimiento |
|---|---|---|
| ALICORP S.A.A. | 20100055237 | AlaCena: mayonesa, ketchup, mostaza; abarrotes |
| SAN FERNANDO S.A. | 20100154308 | Hot dog, jamón, embutidos, pollo, cerdo y huevos |
| ARCA CONTINENTAL LINDLEY S.A. | 20101024645 | Coca-Cola, Inca Kola y agua San Luis |
| AJEPER S.A. | 20331061655 | Agua Cielo / grupo AJE |
| LECHE GLORIA S.A. | 20100190797 | Leche, evaporada, mantequilla y lácteos |
| MAKRO SUPERMAYORISTA S.A. | 20492092313 | Mayorista multimarca: abarrotes, frescos y bebidas según disponibilidad |
| Carnicería Don Mateo [FICTICIO] | 00000000001 | Ejemplo local para res, lomo, cerdo y cecina |

El identificador `00000000001` **no es un RUC real**: es un marcador de prueba
porque el esquema exige once dígitos. El nombre y el listado lo señalan como
ficticio. Reemplazarlo por la identidad real antes de registrar compras reales.
No se atribuyen teléfonos, correos, cuentas bancarias ni representantes
inventados a empresas reales ni al ejemplo.

Contactos públicos cargados: Alicorp atención al cliente `+51 1 708 9300`;
Lindley `0800-1-4000`; San Fernando ventas
`compramucho@corporativo.sanfernando.pe`. Los demás contactos quedan vacíos.
Los datos bancarios y representantes permanecen vacíos. Crédito inicial cero
es el valor por defecto del sistema; **no representa un plazo comercial pactado**.

Las marcas/rubros son referencias para localizar proveedores, no prueban
contratos, disponibilidad de todos los insumos, reparto a Cañete, cupos ni
relación comercial con La Veneziana. La razón social/RUC de cada compra debe
corresponder al emisor real de la factura, que puede ser un distribuidor local.
No se verificó condición ACTIVO/HABIDO mediante una consulta SUNAT en línea.
El estado «activo» del registro únicamente permite seleccionarlo en el sistema.

Se conserva el agua **San Luis** existente en la carta. Agregar AJEPER como
proveedor de Cielo no agrega ni sustituye productos, tamaños, precios o stock.
Los insumos siguen pudiendo comprarse a distintos proveedores; estos rubros
no crean una relación exclusiva ni cambian las recetas.

## Fuentes

- Alicorp: [RUC en memoria corporativa](https://www.alicorp.com.pe/media/PDF/Memoria_Anual_2006.pdf),
  [AlaCena y salsas en memoria 2023](https://www.alicorp.com.pe/media/PDF/memoria_anual_2023.pdf),
  [contacto oficial](https://www.alicorp.com.pe/pe/es/contacto).
- San Fernando: [identidad y RUC](https://corporativo.sanfernando.pe/politicas-de-privacidad/),
  [productos](https://corporativo.sanfernando.pe/), [contacto de ventas](https://corporativo.sanfernando.pe/contacto/).
- Lindley: [RUC en resolución PRODUCE](https://cdn.www.gob.pe/uploads/document/file/5318330/4769647-rd-645-2023-produce-dgaami.pdf),
  [embotelladora y marcas](https://www.arcacontinentallindley.pe/),
  [contacto](https://www.arcacontinentallindley.pe/servicio-cliente/).
- AJEPER: [RUC en resolución INDECI](https://www.gob.pe/institucion/indeci/normas-legales/6795831-057-2025-indeci),
  [Cielo en AJE](https://www.ajegroup.com/marca/cielo/).
- Gloria: [identidad y RUC](https://www.gloria.com.pe/images/politicasyprivacidad.pdf),
  [web corporativa](https://www.gloria.com.pe/).
- Makro: [identidad, RUC y funcionamiento mayorista](https://www.makro.pe/terminos-y-condiciones).
- Carnicería: creación ficticia para este proyecto; sin fuente externa.

## Archivos, carga y pruebas

`data/proveedores-referencia.mjs` contiene referencias, rubros, contactos y
fuentes. `src/services/proveedores-referencia.service.js` hace la carga
transaccional y registra auditoría por alta. La configuración
`PROVEEDORES_REFERENCIA_V1` conserva marcas/fuentes sin modificar el esquema.
`listarProveedores` permite buscar por nombre, RUC, marca o rubro; el listado
web muestra marcas, rubro y advertencia del identificador ficticio.

Desde `CODIGO/backend`:

```powershell
npm.cmd run proveedores:validar
npm.cmd run test:proveedores
npm.cmd run test:proveedores:integracion
npm.cmd run proveedores:cargar
```

Carga limitada a desarrollo local. Repetir no duplica proveedores ni reemplaza
contactos, estados o crédito editados. Si el RUC corresponde a un nombre distinto,
se cancela la carga. No crea compras, facturas, deudas, movimientos ni existencias.
La prueba de integración usa rollback y comprueba esos límites.
