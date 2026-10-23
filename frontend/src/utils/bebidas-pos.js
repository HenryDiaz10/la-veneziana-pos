import { aCentimos } from './carrito-calculo.js'

// Agrupación visual explícita: nunca fusionar los productos ni sus insumos.
// Los SKU ajenos a esta carta siguen mostrándose como artículos independientes.
const TAMANOS = {
  PERSONAL: ['Personal', 0], MEDIO: ['500 ml', 1], GORDITA: ['Gordita', 2],
  '1L': ['1 litro', 3], '15L': ['1.5 litros', 4], '3L': ['3 litros', 5]
}

export function obtenerFamiliaBebida(producto) {
  const sku = producto?.sku
  if (sku === 'CARTA-FRI-AGUA' || sku === 'CARTA-FRI-AGUA-1L') {
    return { clave: 'san-luis', nombre: 'Agua San Luis',
      presentacion: sku === 'CARTA-FRI-AGUA' ? '625 ml' : '1 litro',
      orden: sku === 'CARTA-FRI-AGUA' ? 0 : 1 }
  }
  const coincidencia = /^CARTA-FRI-(GAS|COCA)-(PERSONAL|MEDIO|GORDITA|1L|15L|3L)$/.exec(sku ?? '')
  if (!coincidencia || (coincidencia[1] === 'COCA' && coincidencia[2] === 'GORDITA')) return null
  const inca = coincidencia[1] === 'GAS'
  const [presentacion, orden] = TAMANOS[coincidencia[2]]
  return { clave: inca ? 'inca-kola' : 'coca-cola', nombre: inca ? 'Inca Kola' : 'Coca-Cola', presentacion, orden }
}

export function obtenerPresentacionesBebida(productos, claveFamilia) {
  return productos.filter(p => p.estado === 'activo' && obtenerFamiliaBebida(p)?.clave === claveFamilia)
    .toSorted((a, b) => obtenerFamiliaBebida(a).orden - obtenerFamiliaBebida(b).orden || a.id - b.id)
}

export function agruparBebidasPos(productos) {
  const resultado = []
  const familias = new Map()
  for (const producto of productos) {
    const familia = obtenerFamiliaBebida(producto)
    if (!familia) { resultado.push(producto); continue }
    if (producto.estado !== 'activo') continue
    let tarjeta = familias.get(familia.clave)
    if (!tarjeta) {
      // ID sintético exclusivamente para React. Al carrito va el ID real del envase.
      tarjeta = { ...producto, id: `bebida-${familia.clave}`, nombre: familia.nombre,
        descripcion: 'Elige la presentación y su precio al añadir al pedido.',
        esGrupoBebida: true, productoPreferidoId: producto.id, presentacionesCount: 0 }
      familias.set(familia.clave, tarjeta)
      resultado.push(tarjeta)
    }
    tarjeta.presentacionesCount++
    if (aCentimos(producto.precio_venta_base) < aCentimos(tarjeta.precio_venta_base)) {
      tarjeta.precio_venta_base = producto.precio_venta_base
      tarjeta.productoPreferidoId = producto.id
    }
  }
  return resultado
}
