import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe problemas operativos y su resolución.
// Registrar una incidencia no modifica inventario automáticamente.
export const IncidenciaOperativa = sequelize.define(
  'IncidenciaOperativa',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Insumo relacionado, cuando corresponde.
    insumo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'insumos_almacen',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Tarea relacionada, cuando corresponde.
    tarea_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'kds_tareas',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Clasificación del problema según el SQL.
    tipo: {
      type: DataTypes.ENUM(
        'quiebre',
        'merma',
        'impresion',
        'conexion',
        'otro',
      ),
      allowNull: false,
    },

    // Explicación obligatoria de lo ocurrido.
    descripcion: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },

    // Usuario que registra la incidencia.
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },

    // Estado de atención de la incidencia.
    estado: {
      type: DataTypes.ENUM('abierta', 'resuelta'),
      allowNull: false,
      defaultValue: 'abierta',
    },

    // Fecha y hora de creación del registro.
    creado_en: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    // Fecha de resolución, cuando corresponda.
    resuelto_en: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'incidencias_operativas',

    // Tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: false,
  },
);