// Empresas y datos públicos consultados el 06/11/2026. No representan contratos
// con la pizzería. Los contactos no verificados y datos bancarios quedan vacíos.
export const CLAVE_PROVEEDORES_REFERENCIA = 'PROVEEDORES_REFERENCIA_V1';
export const proveedoresReferencia = [
  { razon_social: 'ALICORP S.A.A.', ruc: '20100055237', telefono_contacto: '+51 1 708 9300', correo_contacto: null,
    marcas: ['AlaCena', 'Alicorp'], rubro: 'Mayonesa, ketchup, mostaza y abarrotes', ficticio: false,
    fuentes: ['https://www.alicorp.com.pe/media/PDF/Memoria_Anual_2006.pdf', 'https://www.alicorp.com.pe/media/PDF/memoria_anual_2023.pdf', 'https://www.alicorp.com.pe/pe/es/contacto'] },
  { razon_social: 'SAN FERNANDO S.A.', ruc: '20100154308', telefono_contacto: null, correo_contacto: 'compramucho@corporativo.sanfernando.pe',
    marcas: ['San Fernando'], rubro: 'Hot dog, jamón, embutidos, pollo, cerdo y huevos', ficticio: false,
    fuentes: ['https://corporativo.sanfernando.pe/politicas-de-privacidad/', 'https://corporativo.sanfernando.pe/', 'https://corporativo.sanfernando.pe/contacto/'] },
  { razon_social: 'ARCA CONTINENTAL LINDLEY S.A.', ruc: '20101024645', telefono_contacto: '0800-1-4000', correo_contacto: null,
    marcas: ['Inca Kola', 'Coca-Cola', 'San Luis'], rubro: 'Gaseosas y agua San Luis por presentación', ficticio: false,
    fuentes: ['https://cdn.www.gob.pe/uploads/document/file/5318330/4769647-rd-645-2023-produce-dgaami.pdf', 'https://www.arcacontinentallindley.pe/', 'https://www.arcacontinentallindley.pe/servicio-cliente/'] },
  { razon_social: 'AJEPER S.A.', ruc: '20331061655', telefono_contacto: null, correo_contacto: null,
    marcas: ['AJE', 'Cielo'], rubro: 'Agua Cielo; alternativa de abastecimiento de agua envasada', ficticio: false,
    fuentes: ['https://www.gob.pe/institucion/indeci/normas-legales/6795831-057-2025-indeci', 'https://www.ajegroup.com/marca/cielo/'] },
  { razon_social: 'LECHE GLORIA S.A.', ruc: '20100190797', telefono_contacto: null, correo_contacto: null,
    marcas: ['Gloria'], rubro: 'Leche, leche evaporada, mantequilla y lácteos', ficticio: false,
    fuentes: ['https://www.gloria.com.pe/images/politicasyprivacidad.pdf', 'https://www.gloria.com.pe/'] },
  { razon_social: 'MAKRO SUPERMAYORISTA S.A.', ruc: '20492092313', telefono_contacto: null, correo_contacto: null,
    marcas: ['Makro', 'Multimarca'], rubro: 'Abarrotes, harina, arroz, azúcar, frutas, verduras, quesos y bebidas según disponibilidad', ficticio: false,
    fuentes: ['https://www.makro.pe/terminos-y-condiciones', 'https://www.makro.plazavea.com.pe/'] },
  { razon_social: 'Carnicería Don Mateo [FICTICIO]', ruc: '00000000001', telefono_contacto: null, correo_contacto: null,
    marcas: ['Ejemplo local'], rubro: 'EJEMPLO: res, lomo, carne molida, cerdo y cecina. Reemplazar por proveedor real.', ficticio: true, fuentes: [] },
];

// Búsqueda por marca/rubro sin cambiar la razón social legal del proveedor.
export const normalizarProveedor = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function referenciasCoincidentes(referencias, texto) {
  const busqueda = normalizarProveedor(texto);
  return busqueda ? referencias.filter(r => normalizarProveedor([r.razon_social, r.rubro, ...(r.marcas ?? [])].join(' ')).includes(busqueda)).map(r => r.ruc) : [];
}
