const texto = (valor, max) => typeof valor === 'string' && valor.length > 0 && [...valor].length <= max &&
  ![...valor].some(c => c.codePointAt(0) <= 31 || (c.codePointAt(0) >= 127 && c.codePointAt(0) <= 159))

export function validarCliente(datos) {
  const errores = {}
  if (!texto(datos.nombres, 150)) errores.nombres = 'Escribe los nombres, hasta 150 caracteres.'
  if (datos.apellidos !== null && !texto(datos.apellidos, 150)) errores.apellidos = 'Usa hasta 150 caracteres, sin saltos de línea.'
  const doc = datos.numero_documento
  const patron = datos.tipo_documento === 'DNI' ? /^\d{8}$/ : datos.tipo_documento === 'RUC' ? /^\d{11}$/ : /^[A-Z0-9]{5,20}$/
  if (doc !== null && !patron.test(doc)) errores.numero_documento = datos.tipo_documento === 'DNI' ? 'El DNI debe tener 8 dígitos.' : datos.tipo_documento === 'RUC' ? 'El RUC debe tener 11 dígitos.' : 'Usa entre 5 y 20 letras o números.'
  if (datos.telefono_principal !== null && !/^\+?\d{6,19}$/.test(datos.telefono_principal)) errores.telefono_principal = 'Usa de 6 a 19 dígitos, con + inicial opcional.'
  if (!doc && !datos.telefono_principal) errores.numero_documento = 'Indica al menos un documento o teléfono.'
  return errores
}

export function validarDireccion(datos) {
  const errores = {}
  for (const [campo, max] of [['alias', 50], ['direccion_completa', 255], ['referencia', 255]]) {
    if ((campo === 'direccion_completa' || datos[campo] !== null) && !texto(datos[campo], max)) errores[campo] = `Escribe un texto de hasta ${max} caracteres, sin saltos de línea.`
  }
  const gps = datos.coordenadas_gps
  if (gps !== null) {
    const [latitud, longitud] = gps.split(',').map(Number)
    if (!/^-?\d{1,3}(?:\.\d{1,8})?,-?\d{1,3}(?:\.\d{1,8})?$/.test(gps) || Math.abs(latitud) > 90 || Math.abs(longitud) > 180) errores.coordenadas_gps = 'Usa latitud,longitud válidas; por ejemplo -12.0464,-77.0428.'
  }
  return errores
}
