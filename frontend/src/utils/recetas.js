const UNIDADES = {
  kg: { dimension: 'masa', factor: 1000n }, g: { dimension: 'masa', factor: 1n },
  l: { dimension: 'volumen', factor: 1000n }, ml: { dimension: 'volumen', factor: 1n },
  un: { dimension: 'unidades', factor: 1n }
}
const MAXIMO = 999999999999n
export const baseInsumo = insumo => insumo?.unidad?.abreviatura?.toLowerCase() ?? ''
export const unidadesInsumo = insumo => baseInsumo(insumo) === 'kg' ? ['kg', 'g'] : baseInsumo(insumo) === 'l' ? ['l', 'ml'] : baseInsumo(insumo) === 'un' ? ['un'] : []
export const etiquetaUnidad = unidad => unidad === 'l' ? 'L' : unidad

function decimal(valor, decimales) {
  if (typeof valor !== 'string' || !new RegExp(`^\\d{1,12}(?:\\.\\d{1,${decimales}})?$`).test(valor)) return null
  const [entero, fraccion = ''] = valor.split('.')
  return { n: BigInt(entero + fraccion), d: 10n ** BigInt(fraccion.length) }
}
const redondear = (n, d) => n / d + (n % d * 2n >= d ? 1n : 0n)
const cuatro = n => `${n / 10000n}.${String(n % 10000n).padStart(4, '0')}`
const dos = n => `${n / 100n}.${String(n % 100n).padStart(2, '0')}`

// Solo se envía BRUTO en unidad base; el neto se convierte una única vez.
export function calcularIngrediente(fila) {
  const errores = {}
  const cantidad = decimal(fila.cantidad, 8)
  const merma = decimal(fila.merma, 2)
  const mermaCentesimas = merma ? merma.n * 100n / merma.d : -1n
  if (!cantidad || cantidad.n <= 0n) errores.cantidad = 'Indica una cantidad positiva, sin comas y con hasta 8 decimales.'
  if (mermaCentesimas < 0n || mermaCentesimas >= 10000n) errores.merma = 'La merma debe estar entre 0 y 99.99, con hasta 2 decimales.'
  if (!['bruta', 'neta'].includes(fila.tipo)) errores.tipo = 'Elige cantidad bruta o neta.'
  const base = baseInsumo(fila.insumo)
  const origen = UNIDADES[fila.unidad]
  const destino = UNIDADES[base]
  if (!origen || !destino || origen.dimension !== destino.dimension || !['kg', 'l', 'un'].includes(base)) errores.unidad = 'La unidad no es compatible con la unidad base del insumo.'
  if (fila.insumo?.activo !== true) errores.insumo = 'El insumo está inactivo. Retíralo de la receta para guardar.'
  if (Object.keys(errores).length) return { errores }
  let n = cantidad.n * origen.factor * 10000n
  let d = cantidad.d * destino.factor
  if (fila.tipo === 'neta') { n *= 10000n; d *= 10000n - mermaCentesimas }
  const bruto = redondear(n, d)
  if (bruto <= 0n || bruto > MAXIMO) return { errores: { cantidad: 'La cantidad convertida debe ser al menos 0.0001 y no superar 99999999.9999 en la unidad base.' } }
  return { errores: {}, base, bruto: cuatro(bruto), neto: cuatro(redondear(bruto * (10000n - mermaCentesimas), 10000n)),
    rendimiento: dos(10000n - mermaCentesimas), merma: dos(mermaCentesimas) }
}

export function filasDesdeReceta(receta) {
  return (receta?.ingredientes ?? []).map(i => ({ clave: `insumo-${i.insumo_id}`, insumo: i.insumo,
    cantidad: String(i.cantidad_bruta_necesaria), unidad: baseInsumo(i.insumo), tipo: 'bruta', merma: String(i.porcentaje_merma_esperado ?? '0.00') }))
}

export function prepararReceta(filas, varianteId) {
  if (filas.length < 1 || filas.length > 100) return { error: 'La receta debe contener entre 1 y 100 ingredientes.' }
  if (new Set(filas.map(f => f.insumo.id)).size !== filas.length) return { error: 'No repitas un insumo en la misma receta.' }
  const calculos = filas.map(calcularIngrediente)
  const indiceError = calculos.findIndex(c => Object.keys(c.errores).length > 0)
  if (indiceError >= 0) return { error: 'Revisa los campos del ingrediente indicado.', indiceError, errores: calculos[indiceError].errores }
  return { datos: { variante_id: varianteId, ingredientes: filas.map((f, i) => ({ insumo_id: f.insumo.id,
    cantidad_bruta_necesaria: calculos[i].bruto, porcentaje_merma_esperado: calculos[i].merma, unidad: calculos[i].base })) } }
}
