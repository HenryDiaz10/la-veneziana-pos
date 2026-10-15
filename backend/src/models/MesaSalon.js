import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las mesas del restaurante y su ubicación en el salón.
export const MesaSalon = sequelize.define(
  'MesaSalon',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Zona del restaurante a la que pertenece la mesa.
    zona_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'zonas_restaurante',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Código visible, obligatorio y único, por ejemplo: M01.
    codigo_mesa: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },

    // Cantidad de sillas registrada para la mesa.
    capacidad_sillas: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 4,
    },

    // Estado de la mesa según el SQL.
    estado_actual: {
      type: DataTypes.ENUM(
        'libre',
        'ocupada',
        'sucia_por_limpiar',
        'inhabilitada',
      ),
      allowNull: true,
      defaultValue: 'libre',
    },

    // Usuario responsable de atender la mesa, cuando corresponde.
    mesero_asignado_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'usuarios',
        key: 'id',
      },

      // Conserva la mesa si se elimina el usuario asignado.
      onDelete: 'SET NULL',
      onUpdate: 'NO ACTION',
    },

    // Posición horizontal utilizada para representar el croquis.
    posicion_x: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    // Posición vertical utilizada para representar el croquis.
    posicion_y: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'mesas_salon',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);