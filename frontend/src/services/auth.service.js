import { solicitarApi } from './api.js'

// Iniciar sesión.
// La cookie HttpOnly se recibe mediante el navegador.
export async function iniciarSesion({ email, password }) {
  const respuesta = await solicitarApi('/auth/login', {
    metodo: 'POST',
    datos: {
      // Recortar únicamente los espacios exteriores del correo.
      email: email.trim(),

      // Conservar la contraseña exactamente como fue escrita.
      password
    }
  })

  return respuesta.usuario
}

// Consultar la identidad y los permisos de la sesión vigente.
// También se utilizará al recargar la página.
export async function obtenerSesion() {
  const respuesta = await solicitarApi('/auth/session')

  return respuesta.usuario
}

// Revocar la sesión actual y retirar su cookie.
export async function cerrarSesion() {
  await solicitarApi('/auth/logout', {
    metodo: 'POST'
  })
}