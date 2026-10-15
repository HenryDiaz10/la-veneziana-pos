import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Describe el control de reintentos de operaciones.
// No evita duplicados ni recupera respuestas automáticamente.
export const IdempotenciaOperacion = sequelize.define(
  'IdempotenciaOperacion',
  {
    // Identificador grande generado automáticamente por MySQL.
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    // Usuario que ejecuta la operación.
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

    // Nombre del tipo de comando ejecutado.
    tipo_operacion: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },

    // Clave utilizada para identificar el intento lógico.
    clave: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },

    // Huella de la solicitud, con longitud fija según el SQL.
    request_hash: {
      type: DataTypes.CHAR(64),
      allowNull: false,
    },

    // Estado del procesamiento; debe proporcionarlo el servicio.
    estado: {
      type: DataTypes.ENUM('procesando', 'confirmada'),
      allowNull: false,
    },

    // Código HTTP asociado al resultado, cuando esté disponible.
    http_status: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },

    // Resultado que podrá recuperarse ante un reintento.
    respuesta_json: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },

    // Fecha y hora de creación del registro.
    creado_en: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Nombre exacto de la tabla definida en el SQL.
    tableName: 'idempotencia_operaciones',

    // Tiene fecha de creación, pero no de modificación.
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: false,

    indexes: [
      {
        // Identifica la operación dentro del usuario y tipo de comando.
        name: 'uq_idempotencia',
        unique: true,
        fields: ['usuario_id', 'tipo_operacion', 'clave'],
      },
    ],
  },
);