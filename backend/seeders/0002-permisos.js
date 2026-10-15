// Permisos mínimos definidos en el SQL del proyecto.
const permisos = [
  ['pedidos', 'crear', 'Confirmar o ampliar pedidos'],
  ['mesas', 'gestionar', 'Ocupar y limpiar mesas'],
  ['kds', 'operar', 'Preparar y despachar tareas'],
  ['ventas', 'cobrar', 'Cobrar con sesión abierta'],
  ['ventas', 'devolver', 'Autorizar devolución'],
  ['caja', 'gestionar', 'Abrir, movimientos y cierre'],
  ['catalogo', 'gestionar', 'Productos, variantes y recetas'],
  ['inventario', 'gestionar', 'Compras y ajustes'],
  ['clientes', 'buscar', 'Búsqueda limitada de clientes'],
  ['reportes', 'leer', 'Reportes gerenciales'],
  ['seguridad', 'gestionar', 'Usuarios y permisos'],
  ['configuracion', 'gestionar', 'Parámetros y dispositivos']
];

export async function sembrarPermisos({ sequelize, transaction }) {
  for (const [modulo, accion, descripcion] of permisos) {
    await sequelize.query(
      `
        INSERT INTO permisos (
          modulo,
          accion,
          descripcion
        )
        VALUES (?, ?, ?)

        ON DUPLICATE KEY UPDATE modulo = modulo
      `,
      {
        replacements: [modulo, accion, descripcion],
        transaction,
        logging: false
      }
    );
  }
}