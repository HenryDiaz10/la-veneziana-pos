import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe la cola persistente de trabajos de impresión.
// No se comunica con impresoras ni imprime automáticamente.
export const TrabajoImpresion = sequelize.define(
  'TrabajoImpresion',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Identificador obligatorio y único del trabajo.
    job_uid: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },

    // Venta relacionada, cuando corresponde.
    venta_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'ventas_comprobantes',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Pedido relacionado, cuando corresponde.
    pedido_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'pedidos_master',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Sesión de caja relacionada, cuando corresponde.
    sesion_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'sesiones_caja_z',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Clase de documento solicitado.
    tipo: {
      type: DataTypes.ENUM(
        'ticket',
        'comanda',
        'etiqueta',
        'cierre',
        'copia',
      ),
      allowNull: false,
    },

    // Identificador del destino de impresión.
    destino: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // Datos necesarios para construir el documento.
    contenido_json: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    // Estado del procesamiento del trabajo.
    estado: {
      type: DataTypes.ENUM(
        'pendiente',
        'enviado',
        'confirmado',
        'error',
      ),
      allowNull: false,
      defaultValue: 'pendiente',
    },

    // Número de intentos registrados.
    intentos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    // Usuario que solicitó el trabajo.
    solicitado_por: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Fecha y hora de creación del trabajo.
    creado_en: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    // Fecha en que se registró su confirmación.
    confirmado_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'trabajos_impresion',

    // Tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: false,
  },
);