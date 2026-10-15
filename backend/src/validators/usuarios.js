import { validarCredencialesLogin } from './login.js';

// Validar los datos permitidos para crear un empleado.
// Devolver null cuando la entrada no sea válida.
export function validarAltaUsuario(datos) {
  if (
    datos === null ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    return null;
  }

  // Rechazar campos adicionales para evitar asignaciones inesperadas.
  const camposPermitidos = new Set([
    'nombre',
    'email',
    'password',
    'rolId'
  ]);

  if (
    Object.keys(datos).some(campo => !camposPermitidos.has(campo))
  ) {
    return null;
  }

  if (typeof datos.nombre !== 'string') {
    return null;
  }

  const nombre = datos.nombre.trim();

  // Respetar el límite de la columna nombre_completo.
  // Evitar saltos de línea y otros caracteres de control.
  if (
    nombre.length === 0 ||
    [...nombre].length > 150 ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(nombre)
  ) {
    return null;
  }

  const credenciales = validarCredencialesLogin(datos);

  if (
    credenciales === null ||
    [...credenciales.password].length < 12
  ) {
    return null;
  }

  // Recibir el identificador como número entero positivo.
  // La existencia del rol se comprobará en el servicio.
  if (
    !Number.isSafeInteger(datos.rolId) ||
    datos.rolId <= 0 ||
    datos.rolId > 2147483647
  ) {
    return null;
  }

  // Construir expresamente los datos aceptados.
  // El estado y el hash serán establecidos por el servicio.
  return {
    nombre,
    email: credenciales.email,
    password: credenciales.password,
    rolId: datos.rolId
  };
}

// Validar una solicitud de cambio de estado del empleado.
export function validarCambioEstadoUsuario(datos) {
  if (
    datos === null ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    return null;
  }

  // Este proceso solo permite modificar el estado.
  const campos = Object.keys(datos);

  if (
    campos.length !== 1 ||
    campos[0] !== 'estado'
  ) {
    return null;
  }

  const estadosPermitidos = new Set([
    'activo',
    'suspendido',
    'cesado'
  ]);

  if (!estadosPermitidos.has(datos.estado)) {
    return null;
  }

  return {
    estado: datos.estado
  };
}

// Validar una solicitud de cambio de rol.
export function validarCambioRolUsuario(datos) {
  if (
    datos === null ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    return null;
  }

  // Permitir únicamente el identificador del nuevo rol.
  const campos = Object.keys(datos);

  if (
    campos.length !== 1 ||
    campos[0] !== 'rolId'
  ) {
    return null;
  }

  if (
    !Number.isSafeInteger(datos.rolId) ||
    datos.rolId <= 0 ||
    datos.rolId > 2147483647
  ) {
    return null;
  }

  // La existencia del rol se comprobará en el servicio.
  return {
    rolId: datos.rolId
  };
}

// Validar la nueva contraseña enviada por un administrador.
export function validarRestablecimientoPassword(datos) {
  if (
    datos === null ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    return null;
  }

  // Aceptar únicamente la nueva contraseña.
  const campos = Object.keys(datos);

  if (
    campos.length !== 1 ||
    campos[0] !== 'password'
  ) {
    return null;
  }

  if (
    typeof datos.password !== 'string' ||
    [...datos.password].length < 12 ||
    Buffer.byteLength(datos.password, 'utf8') > 72
  ) {
    return null;
  }

  // Conservar los espacios y caracteres exactamente como llegaron.
  return {
    password: datos.password
  };
}