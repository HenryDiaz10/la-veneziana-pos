import test from 'node:test'
import assert from 'node:assert/strict'
import { useCartStore } from '../src/stores/useCartStore.js'
import { calcularLineaCarrito } from '../src/utils/carrito-calculo.js'
import {
  estimarBorrador,
  estimarSeleccionCarrito,
  construirComandoCarrito
} from '../src/utils/carrito-estimacion.js'

// Producto con nombre largo (150 caracteres)
const nombreLargo = 'Pizza Artesanal Especial con Prosciutto di Parma, Mozzarella Fior di Latte, Tomates San Marzano y Reducción de Albahaca Fresca de la Casa Veneziana Gourmet'
const productoNombreLargo = {
  id: 101,
  nombre: nombreLargo,
  estado: 'activo',
  precio_venta_base: '45.00'
}

// Configuración con 10 modificadores en un grupo múltiple
const opcionesDiezModificadores = Array.from({ length: 10 }, (_, i) => ({
  id: 200 + i,
  grupo_id: 50,
  nombre_modificador: `Extra Insumo Gourmet #${i + 1}`,
  precio_adicional: ((i + 1) * 1.5).toFixed(2), // 1.50, 3.00, 4.50, etc.
  es_exclusion: false
}))

const configuracionDiezExtras = {
  productoId: 101,
  variantes: [
    { id: 301, nombre_variante: 'Familiar Gigante 45cm', precio_adicional: '15.00' }
  ],
  grupos: [
    {
      id: 50,
      nombre_grupo: 'Extras Gourmet',
      es_multiple: true,
      es_obligatorio: false,
      opciones: opcionesDiezModificadores
    },
    {
      id: 51,
      nombre_grupo: 'Borde Relleno',
      es_multiple: false,
      es_obligatorio: true,
      opciones: [
        { id: 250, grupo_id: 51, nombre_modificador: 'Borde Tradicional', precio_adicional: '0.00', es_exclusion: false },
        { id: 251, grupo_id: 51, nombre_modificador: 'Borde de Queso', precio_adicional: '5.00', es_exclusion: false }
      ]
    }
  ]
}

test('diez modificadores en una misma línea calculan precio exacto con céntimos BigInt', () => {
  const idsDiezExtras = opcionesDiezModificadores.map(o => o.id)
  assert.equal(idsDiezExtras.length, 10)

  const seleccionDiez = {
    productoId: 101,
    varianteId: 301, // +15.00
    modificadoresIds: [...idsDiezExtras, 251], // 10 extras + 1 borde (+5.00)
    cantidad: 2
  }

  const estimacion = estimarSeleccionCarrito({
    producto: productoNombreLargo,
    configuracion: configuracionDiezExtras,
    seleccion: seleccionDiez
  })

  // Precio base 45.00 + variante 15.00 + borde 5.00 = 65.00
  // Suma de los 10 extras: sum_{i=1..10} (1.5 * i) = 1.5 * 55 = 82.50
  // Unitario: 65.00 + 82.50 = 147.50
  // Total para 2 unidades: 147.50 * 2 = 295.00
  assert.equal(estimacion.precioUnitario, '147.50')
  assert.equal(estimacion.total, '295.00')
})

test('treinta líneas con importes grandes y nombres largos sin desbordes numéricos', () => {
  useCartStore.setState({ lineas: [] })

  // Crear 30 líneas con cantidades variadas y precio base alto
  const lineasParaAnadir = Array.from({ length: 30 }, (_, index) => ({
    productoId: 101,
    varianteId: 301,
    modificadoresIds: [250], // Borde tradicional
    cantidad: (index % 5) + 1 // cantidades de 1 a 5
  }))

  useCartStore.getState().agregarLineas(lineasParaAnadir)
  const lineasEnStore = useCartStore.getState().lineas
  assert.equal(lineasEnStore.length, 30)

  // Catálogo en memoria
  const catalogoMemoria = {
    101: {
      producto: productoNombreLargo,
      configuracion: configuracionDiezExtras
    }
  }

  const resumen = estimarBorrador(lineasEnStore, catalogoMemoria)
  assert.equal(resumen.resultados.length, 30)
  assert.equal(resumen.errorTotal, '')

  // Cada línea con variante 301 tiene unitario: 45.00 + 15.00 = 60.00
  // Cantidades: 6 ciclos de [1, 2, 3, 4, 5] = 6 * 15 = 90 unidades en total
  // Total: 90 * 60.00 = 5400.00
  assert.equal(resumen.total, '5400.00')

  // Desglose informativo de IGV
  const subtotalNumero = Number(resumen.total)
  const igvInformativo = (subtotalNumero * 0.18 / 1.18).toFixed(2)
  assert.equal(igvInformativo, '823.73')
})

test('importe grande extremo (S/ 99,999.00 por 100 unidades) se calcula con exactitud', () => {
  const calculo = calcularLineaCarrito({
    precioBase: '99999.00',
    adicionales: ['500.50'],
    cantidad: 100
  })

  // Unitario: 100499.50
  // Total para 100: 10049950.00
  assert.equal(calculo.precioUnitario, '100499.50')
  assert.equal(calculo.total, '10049950.00')
})

test('edición de línea en el POS conserva la cantidad original', () => {
  useCartStore.setState({ lineas: [] })

  useCartStore.getState().agregarLinea({
    productoId: 101,
    varianteId: null,
    modificadoresIds: [250],
    cantidad: 7
  })

  const lineaOriginal = useCartStore.getState().lineas[0]
  assert.equal(lineaOriginal.cantidad, 7)

  // Editar cambiando la variante pero sin pasar cantidad explícita en cambios
  useCartStore.getState().actualizarLinea(lineaOriginal.id, {
    varianteId: 301
  })

  const lineaActualizada = useCartStore.getState().lineas[0]
  assert.equal(lineaActualizada.varianteId, 301)
  assert.equal(lineaActualizada.cantidad, 7, 'La edición debe conservar la cantidad de 7')
})

test('validación rechaza selección si falta un grupo obligatorio', () => {
  // Omitimos la opción del grupo obligatorio 51 (Borde Relleno)
  const seleccionSinObligatorio = {
    productoId: 101,
    varianteId: null,
    modificadoresIds: [], // Falta opción del grupo 51
    cantidad: 1
  }

  assert.throws(
    () =>
      estimarSeleccionCarrito({
        producto: productoNombreLargo,
        configuracion: configuracionDiezExtras,
        seleccion: seleccionSinObligatorio
      }),
    /Borde Relleno/
  )
})

test('comando de pedido para la futura fase 28 contiene únicamente identificadores sin precios del cliente', () => {
  const lineas = [
    {
      id: 'local-1',
      productoId: 101,
      varianteId: 301,
      modificadoresIds: [250],
      cantidad: 3,
      precioFalsoDelCliente: '0.01',
      totalFalso: '0.03'
    }
  ]

  const comando = construirComandoCarrito(lineas)
  assert.deepEqual(comando, {
    lineas: [
      {
        productoId: 101,
        varianteId: 301,
        modificadoresIds: [250],
        cantidad: 3
      }
    ]
  })
})

test('producto inactivo invalida la línea y bloquea el total general en el POS', () => {
  const lineas = [
    { id: 'l1', productoId: 101, varianteId: null, modificadoresIds: [250], cantidad: 1 },
    { id: 'l2', productoId: 999, varianteId: null, modificadoresIds: [], cantidad: 1 }
  ]

  const catalogoConInactivo = {
    101: { producto: productoNombreLargo, configuracion: configuracionDiezExtras },
    999: { error: 'El producto ya no está disponible para la venta.' }
  }

  const resumen = estimarBorrador(lineas, catalogoConInactivo)
  assert.equal(resumen.total, null, 'Un borrador con producto inactivo no debe mostrar total parcial')
  assert.ok(resumen.errorTotal.length > 0)
  assert.equal(resumen.resultados[1].error, 'El producto ya no está disponible para la venta.')
})
