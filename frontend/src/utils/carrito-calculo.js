// Trabajamos con céntimos enteros para evitar errores
// como los que puede producir sumar decimales con Number.
const MAX_CENTIMOS = 999999999999n

export function aCentimos(valor) {
  if (
    typeof valor !== 'string' ||
    !/^\d{1,10}(?:\.\d{1,2})?$/.test(valor)
  ) {
    throw new Error('El precio debe ser un decimal positivo o cero.')
  }

  const [entero, decimal = ''] = valor.split('.')

  const centimos =
    BigInt(entero) * 100n +
    BigInt(decimal.padEnd(2, '0'))

  if (centimos > MAX_CENTIMOS) {
    throw new Error('El importe supera el límite permitido.')
  }

  return centimos
}

export function desdeCentimos(centimos) {
  if (
    typeof centimos !== 'bigint' ||
    centimos < 0n ||
    centimos > MAX_CENTIMOS
  ) {
    throw new Error('El importe está fuera del rango permitido.')
  }

  const entero = centimos / 100n
  const decimal = String(centimos % 100n).padStart(2, '0')

  return `${entero}.${decimal}`
}

// Calcula una estimación de la línea.
// El servidor validará los precios definitivos al registrar el pedido.
export function calcularLineaCarrito({
  precioBase,
  adicionalVariante = '0.00',
  adicionales = [],
  cantidad = 1
}) {
  if (
    !Number.isSafeInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > 10000
  ) {
    throw new Error('La cantidad debe estar entre 1 y 10000.')
  }

  if (!Array.isArray(adicionales) || adicionales.length > 50) {
    throw new Error('Los adicionales de la línea no son válidos.')
  }

  const precioUnitario =
    aCentimos(precioBase) +
    aCentimos(adicionalVariante) +
    adicionales.reduce(
      (suma, precio) => suma + aCentimos(precio),
      0n
    )

  const total = precioUnitario * BigInt(cantidad)

  return {
    precioUnitario: desdeCentimos(precioUnitario),
    total: desdeCentimos(total)
  }
}