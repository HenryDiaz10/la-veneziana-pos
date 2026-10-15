import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe los clientes del restaurante.
// No calcula puntos ni aplica reglas de fidelización automáticamente.
export const Cliente = sequelize.define(
  'Cliente',
  {
    // Identificador generado automáticamente por MySQL.
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Nombres obligatorios del cliente.
    nombres: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    // Apellidos opcionales.
    apellidos: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: null,
    },

    // Tipo de documento definido en el SQL.
    tipo_documento: {
      type: DataTypes.ENUM('DNI', 'CE', 'PASAPORTE', 'RUC'),
      allowNull: true,
      defaultValue: 'DNI',
    },

    // Documento opcional y único.
    numero_documento: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      defaultValue: null,
    },

    // Número de contacto principal.
    telefono_principal: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },

    // Correo opcional; el SQL no lo declara único.
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },

    // Fecha de nacimiento, sin hora.
    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },

    // Saldo actual de puntos del cliente.
    puntos_vip_actuales: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    // Acumulado histórico de puntos.
    puntos_vip_historicos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    // Nivel de fidelización definido en el SQL.
    nivel_vip: {
      type: DataTypes.ENUM(
        'Nuevo',
        'Bronce',
        'Plata',
        'Oro',
        'Black',
      ),
      allowNull: true,
      defaultValue: 'Nuevo',
    },

    // Observaciones internas del cliente.
    notas_internas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Estado del cliente.
    estado: {
      type: DataTypes.ENUM('activo', 'lista_negra'),
      allowNull: true,
      defaultValue: 'activo',
    },

    // Fecha de creación.
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    // Fecha de la última modificación.
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla del SQL.
    tableName: 'clientes',

    // Sequelize administra las fechas con estos nombres.
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    // Conservamos los índices declarados en el SQL.
    indexes: [
      {
        name: 'idx_clientes_doc',
        fields: ['numero_documento'],
      },
      {
        name: 'idx_clientes_tel',
        fields: ['telefono_principal'],
      },
    ],
  },
);