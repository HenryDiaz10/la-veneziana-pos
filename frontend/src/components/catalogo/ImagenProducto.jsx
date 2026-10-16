import { useState } from 'react'

function obtenerUrlImagen(valor) {
  if (typeof valor !== 'string') return null
  const texto = valor.trim()
  if (!texto || texto.length > 255 || /\s/.test(texto)) return null

  try {
    const url = new URL(texto)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return null
    }
    return url.href
  } catch {
    return null
  }
}

function ImagenRemota({ src, descripcion, ajuste }) {
  const [fallida, setFallida] = useState(false)

  if (fallida) {
    return <p className="p-3 text-center text-xs text-app-secundario">Imagen no disponible</p>
  }

  return (
    <img
      src={src}
      alt={descripcion}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFallida(true)}
      className={[
        'h-full w-full',
        ajuste === 'cubrir' ? 'object-cover' : 'object-contain'
      ].join(' ')}
    />
  )
}

// Compartir la vista previa y las miniaturas sin mostrar iconos rotos.
function ImagenProducto({ url, descripcion, className = '', ajuste = 'contener' }) {
  const src = obtenerUrlImagen(url)

  return (
    <div
      className={[
        'flex items-center justify-center overflow-hidden rounded-xl',
        'border border-app-borde bg-app-elevada',
        className
      ].join(' ')}
    >
      {src ? (
        // Reiniciar el error cuando el usuario cambia el enlace.
        <ImagenRemota key={src} src={src} descripcion={descripcion} ajuste={ajuste} />
      ) : (
        <p className="p-3 text-center text-xs text-app-secundario">
          {url?.trim() ? 'URL de imagen no válida' : 'Sin imagen'}
        </p>
      )}
    </div>
  )
}

export default ImagenProducto
