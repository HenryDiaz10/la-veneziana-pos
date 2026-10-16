# API de clientes - fase 19

## Habilitación y permisos

Desde backend, `npm.cmd run crm:habilitar` crea el permiso
`clientes/gestionar` y lo asigna al administrador. Es idempotente y no vuelve
a sembrar ni concede permisos a otros roles. Ya se ejecutó en esta instalación.
Los seeds también incluyen esta extensión para instalaciones nuevas.

`clientes/buscar` permite únicamente consultas limitadas. `clientes/gestionar`
autoriza altas y cambios de clientes y direcciones. Cajeros y meseros conservan
solo búsqueda por defecto; un administrador puede asignar gestionar mediante
la API de roles existente. Recargar la sesión del frontend para recuperar los
permisos actuales. Todas las rutas requieren cookie de sesión; las escrituras
también requieren el origen y encabezado CSRF configurados.

## Rutas

Prefijo `/api/clientes`. Las consultas GET requieren exactamente un parámetro
`documento` o `telefono`, con coincidencia exacta. No hay listado sin filtro,
búsqueda por nombre ni comodines. En perfil y direcciones el filtro debe
coincidir además con el cliente de la ruta.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | /?documento=... o /?telefono=... | clientes y paginacion. |
| GET | /:clienteId?documento=... o ?telefono=... | cliente con actividad resumida. |
| POST | / | Alta de perfil básico. |
| PATCH | /:clienteId | Cambio parcial de perfil básico. |
| GET | /:clienteId/direcciones?documento=... o ?telefono=... | direcciones y paginacion. |
| GET | /:clienteId/puntos?documento=... o ?telefono=... | movimientos y paginacion; requiere clientes/gestionar. |
| POST | /:clienteId/direcciones | Alta de dirección. |
| PATCH | /:clienteId/direcciones/:direccionId | Cambio de dirección perteneciente al cliente. |

Paginación: pagina predeterminada 1, máxima 10000; limite predeterminado 10,
máximo 20. El router admite 120 solicitudes por minuto por IP, con respuesta
429 al excederlo. Los parámetros personales no se registran en el logger y
las respuestas de la API llevan Cache-Control: no-store.

## Datos aceptados

Cliente: nombres (obligatorio al crear), apellidos, tipo_documento,
numero_documento y telefono_principal. El alta requiere documento o teléfono;
un cambio no puede retirar ambos. Teléfono como texto, de 6 a 19 dígitos con
signo + inicial opcional. Tipo DNI por defecto. Reglas de formato de entrada:
DNI de 8 dígitos, RUC de 11, CE/pasaporte alfanumérico de 5 a 20 caracteres.
No se comprueba la identidad en servicios externos.

Apellidos, documento y teléfono admiten null. Los cambios se validan combinando
entrada y registro actual. El documento es único; el teléfono no es único.
Puntos, nivel VIP, estado, notas, email y nacimiento no se aceptan como campos
editables en este perfil básico. Los campos adicionales se rechazan.

Dirección: direccion_completa obligatoria al crear; alias, referencia,
coordenadas_gps y es_predeterminada opcionales. Coordenadas como texto
latitud,longitud, con rangos -90..90 y -180..180. El cliente propietario viene
de la ruta. Las escrituras bloquean al cliente para garantizar como máximo
una dirección preferida, incluso bajo concurrencia. No hay eliminación de
clientes ni direcciones históricas mediante esta API.

## Perfil limitado y actividad

La búsqueda devuelve id, nombres, apellidos, tipo/número de documento y teléfono.
El perfil añade nivel_vip, puntos_vip_actuales y actividad. No devuelve notas,
email, nacimiento ni historial de ventas. Los movimientos de puntos se consultan
separadamente con permiso clientes/gestionar y el mismo filtro exacto.

La consulta de puntos de fase 20 devuelve exclusivamente id (BIGINT como texto),
tipo_movimiento, puntos, descripcion y created_at. Ordena por fecha e id
descendentes, pagina 10 registros por defecto (máximo 20), comprueba el cliente
y no expone identificadores de operaciones ni datos de otras ventas. No crea,
modifica ni elimina movimientos, saldos o niveles VIP. No necesita migraciones.

El servidor cuenta pedidos pagados con ventas emitidas o rechazadas por SUNAT;
excluye ventas anuladas. Actividad devuelve compras_registradas, ultima_compra
y segmento: sin_compras (0), primera_compra (1), recurrente (2 o más).
Es una clasificación de actividad registrada, no un gasto neto: no descuenta
devoluciones ni modifica niveles VIP o puntos. No genera campañas ni mensajes.
La consulta es parametrizada y se ejecuta sobre las tablas existentes.

## Archivos y funciones

- validators/clientes.js: validarCliente normaliza campos permitidos;
  esPerfilClienteValido comprueba el documento y contacto del registro completo;
  validarBusquedaCliente impide consultas sin filtro o con ambos filtros.
- validators/direcciones-clientes.js: validarDireccionCliente valida textos,
  coordenadas y booleano de preferencia.
- services/clientes.service.js: buscarClientes, obtenerPerfilCliente,
  crearCliente y actualizarCliente consultan y escriben con campos explícitos.
- services/direcciones-clientes.service.js: obtenerDireccionesCliente,
  crearDireccionCliente y actualizarDireccionCliente comprueban pertenencia y
  coordinan la dirección preferida mediante transacciones.
- controllers/clientes.controller.js: convierte query/params, rechaza consultas
  inválidas y traduce resultados a 200/201, 400, 404 y 409; fallos inesperados
  pasan al manejador general.
- routes/clientes.routes.js: autentica, limita solicitudes y separa permisos
  de consulta y escritura. app.js monta el router.
- scripts/habilitar-clientes.js y seeders/0002-permisos.js y
  0003-rol-permisos.js: preparan el permiso de escritura sin concederlo por
  defecto a todos los roles con acceso al módulo clientes.

## Verificación

Sintaxis e imports comprobados. Pruebas HTTP/MySQL con cuentas temporales:
401/403, CSRF, filtros obligatorios, paginación, perfil limitado, documento único
en altas simultáneas y cambios parciales. Direcciones ajenas rechazadas y una
única preferida bajo concurrencia, incluida reselección de la misma dirección.
Segmentos comprobados con ventas temporales: cero, una, dos y venta anulada;
puntos y nivel permanecieron intactos. Límite 429 comprobado.

Se retiraron clientes, direcciones, ventas, pedidos, caja, usuarios y sesiones
creados exclusivamente para estas pruebas. Sin dependencias nuevas ni DDL.
