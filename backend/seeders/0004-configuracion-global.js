// Configuración inicial definida en el SQL del proyecto.
const configuraciones = [
  {
    clave: 'EMP_INFO',
    valor: {
      razon_social: null,
      ruc: null,
      direccion: null,
      validado: false
    },
    descripcion: 'Completar y validar antes de emisión'
  },
  {
    clave: 'FINANZAS',
    valor: {
      igv_porcentaje: null,
      moneda: 'PEN',
      precio_incluye_impuesto: true,
      puntos_vip_por_sol: 1
    },
    descripcion:
      'Tasa pendiente de validación, no habilitar cobros sin configuración'
  },
  {
    clave: 'HARDWARE',
    valor: {
      agente_local: null,
      impresoras: []
    },
    descripcion: 'Enrolar agente y dispositivos'
  }
];

export async function sembrarConfiguracionGlobal({
  sequelize,
  transaction
}) {
  for (const configuracion of configuraciones) {
    await sequelize.query(
      `
        INSERT INTO configuracion_global (
          parametro_key,
          valor_json,
          descripcion
        )
        VALUES (?, ?, ?)

        ON DUPLICATE KEY UPDATE parametro_key = parametro_key
      `,
      {
        replacements: [
          configuracion.clave,
          JSON.stringify(configuracion.valor),
          configuracion.descripcion
        ],
        transaction,
        logging: false
      }
    );
  }
}