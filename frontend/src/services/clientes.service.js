import { solicitarApi } from './api.js'

function idValido(id) {
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new TypeError('Cliente no válido.')
  return id
}

// El filtro permanece en memoria; nunca se añade a la URL de la pantalla.
export function filtroCliente(cliente) {
  return cliente.numero_documento
    ? { documento: cliente.numero_documento }
    : { telefono: cliente.telefono_principal }
}

function consultar(ruta, { busqueda, pagina = 1 }, signal) {
  const claves = Object.keys(busqueda ?? {})
  if (claves.length !== 1 || !['documento', 'telefono'].includes(claves[0]) ||
      typeof busqueda[claves[0]] !== 'string' || !busqueda[claves[0]].trim() ||
      !Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000) {
    throw new TypeError('Indica un documento o teléfono exacto.')
  }
  const query = new URLSearchParams({ ...busqueda, pagina: String(pagina), limite: '10' })
  return solicitarApi(`${ruta}?${query}`, { signal })
}

export const buscarClientes = (solicitud, signal) => consultar('/clientes', solicitud, signal)
export const consultarPerfil = (s, signal) => consultar(`/clientes/${idValido(s.id)}`, s, signal)
export const consultarDirecciones = (s, signal) => consultar(`/clientes/${idValido(s.id)}/direcciones`, s, signal)
export const consultarPuntos = (s, signal) => consultar(`/clientes/${idValido(s.id)}/puntos`, s, signal)
export const guardarCliente = (cliente, datos) => solicitarApi(cliente ? `/clientes/${idValido(cliente.id)}` : '/clientes', {
  metodo: cliente ? 'PATCH' : 'POST', datos
})
export const guardarDireccion = (clienteId, direccion, datos) => solicitarApi(
  `/clientes/${idValido(clienteId)}/direcciones${direccion ? `/${idValido(direccion.id)}` : ''}`,
  { metodo: direccion ? 'PATCH' : 'POST', datos }
)
