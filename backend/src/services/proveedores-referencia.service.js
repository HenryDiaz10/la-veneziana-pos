import { sequelize } from '../config/database.js';
import { Rol, ProveedorMaestro, ConfiguracionGlobal, AuditLog } from '../models/index.js';
import { validarProveedor } from '../validators/compras.js';
import { proveedoresReferencia, CLAVE_PROVEEDORES_REFERENCIA } from '../../data/proveedores-referencia.mjs';

// Importación aditiva y repetible. Conservar contactos, crédito y estado que el
// usuario ya haya editado; nunca crear compras, cuentas por pagar o existencias.
export function cargarProveedoresReferencia({ aplicar = false, transaction: padre } = {}) {
  return sequelize.transaction(padre ? { transaction: padre } : {}, async transaction => {
    if (aplicar) await Rol.findOne({ where: { nombre: 'administrador' }, transaction, lock: transaction.LOCK.UPDATE });
    let creados = 0, existentes = 0;
    for (const referencia of proveedoresReferencia) {
      const { razon_social, ruc, telefono_contacto, correo_contacto } = referencia;
      const datos = validarProveedor({ razon_social, ruc, telefono_contacto, correo_contacto, dias_credito: 0, estado: 'activo' });
      const actual = await ProveedorMaestro.findOne({ where: { ruc }, transaction });
      if (actual) {
        const canonico = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (canonico(actual.razon_social) !== canonico(razon_social)) throw new Error(`RUC ya registrado con otra razón social: ${ruc}. No se reemplazó.`);
        existentes++;
      } else if (aplicar) {
        const homonimo = await ProveedorMaestro.findOne({ where: { razon_social }, transaction });
        if (homonimo) throw new Error(`Nombre ya registrado con otro RUC: ${razon_social}`);
        const proveedor = await ProveedorMaestro.create(datos, { transaction });
        await AuditLog.create({ usuario_id: null, entidad_afectada: 'proveedores_maestro', entidad_id: proveedor.id, tipo_evento: 'INSERT', descripcion: referencia.ficticio ? 'Proveedor ficticio de demostración autorizado. Identificador de prueba, sin contactos inventados.' : 'Alta de referencia pública autorizada; no acredita relación comercial ni condiciones de crédito.', datos_nuevos: datos }, { transaction });
        creados++;
      }
    }
    if (aplicar) {
      const [config] = await ConfiguracionGlobal.findOrCreate({ where: { parametro_key: CLAVE_PROVEEDORES_REFERENCIA }, defaults: { descripcion: 'Marcas, rubros y fuentes de los proveedores de referencia.', valor_json: { fecha_consulta: '2026-11-06', proveedores: proveedoresReferencia } }, transaction });
      if (!Array.isArray(config.valor_json?.proveedores)) throw new Error('Configuración de proveedores incompatible.');
    }
    return { aplicado: aplicar, total: proveedoresReferencia.length, reales: 6, ficticios: 1, creados, existentes };
  });
}
