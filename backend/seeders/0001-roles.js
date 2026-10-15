// Roles iniciales definidos en el SQL del proyecto.
const roles = [
  [
    'administrador',
    'Gerencia general con acceso a P&L y Config'
  ],
  [
    'cajero',
    'Gestión de cobros, facturación fiscal y caja'
  ],
  [
    'mesero',
    'Toma de pedidos en salón vía dispositivo móvil'
  ],
  [
    'cocinero',
    'Gestor de tablero Kanban y tiempos KDS'
  ]
];

// Recibir la conexión y la transacción del ejecutor.
export async function sembrarRoles({ sequelize, transaction }) {
  for (const [nombre, descripcion] of roles) {
    await sequelize.query(
      `
        INSERT INTO roles (
          nombre,
          descripcion,
          is_system
        )
        VALUES (?, ?, TRUE)

        ON DUPLICATE KEY UPDATE nombre = nombre
      `,
      {
        replacements: [nombre, descripcion],
        transaction,
        logging: false
      }
    );
  }
}