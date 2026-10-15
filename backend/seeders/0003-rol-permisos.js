// Asignar los permisos iniciales definidos en el SQL.
// Los IDs se obtienen mediante los nombres de roles y permisos.
export async function sembrarRolPermisos({ sequelize, transaction }) {
  await sequelize.query(
    `
      INSERT INTO rol_permisos (
        rol_id,
        permiso_id
      )
      SELECT
        r.id,
        p.id
      FROM roles AS r
      CROSS JOIN permisos AS p
      WHERE
        r.nombre = 'administrador'

        OR (
          r.nombre = 'mesero'
          AND p.modulo IN ('pedidos', 'mesas', 'clientes')
        )

        OR (
          r.nombre = 'cocinero'
          AND p.modulo = 'kds'
        )

        OR (
          r.nombre = 'cajero'
          AND (
            (p.modulo = 'ventas' AND p.accion = 'cobrar')
            OR p.modulo IN ('caja', 'pedidos', 'clientes')
          )
        )

      ON DUPLICATE KEY UPDATE
        permiso_id = rol_permisos.permiso_id
    `,
    {
      transaction,
      logging: false
    }
  );
}