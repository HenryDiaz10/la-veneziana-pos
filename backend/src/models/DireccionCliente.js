import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe las direcciones guardadas de los clientes.
export const DireccionCliente = sequelize.define(
  'DireccionCliente',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Cliente al que pertenece la dirección.
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id',
      },

      // Si se elimina el cliente, se eliminan sus direcciones.
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
    },

    // Nombre corto para identificar la dirección.
    alias: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'Casa',
    },

    // Dirección necesaria para ubicar el destino.
    direccion_completa: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    // Indicaciones adicionales, como un punto de referencia.
    referencia: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    // Coordenadas guardadas como texto: latitud,longitud.
    coordenadas_gps: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },

    // Indica si es la dirección preferida del cliente.
    es_predeterminada: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'direcciones_clientes',

    // Esta tabla no contiene columnas de fechas.
    timestamps: false,
  },
);