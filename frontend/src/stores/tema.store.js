import { create } from 'zustand'

// Guardar únicamente la preferencia visual, nunca credenciales.
const CLAVE_TEMA = 'la-veneziana-tema'

function leerTemaGuardado() {
  try {
    const tema = localStorage.getItem(CLAVE_TEMA)

    if (tema === 'claro' || tema === 'oscuro') {
      return tema
    }
  } catch {
    // El navegador puede impedir el acceso al almacenamiento.
    // La interfaz seguirá funcionando con el tema predeterminado.
  }

  return 'claro'
}

// Aplicar el tema al documento.
// Los estilos de los layouts utilizarán este atributo.
function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema

  // Adaptar controles nativos y barras de desplazamiento.
  document.documentElement.style.colorScheme =
    tema === 'oscuro' ? 'dark' : 'light'
}

export const useTemaStore = create((set, get) => ({
  tema: leerTemaGuardado(),

  // Aplicar la preferencia antes de mostrar la aplicación.
  inicializarTema: () => {
    aplicarTema(get().tema)
  },

  cambiarTema: (tema) => {
    if (tema !== 'claro' && tema !== 'oscuro') {
      return
    }

    aplicarTema(tema)
    set({ tema })

    try {
      localStorage.setItem(CLAVE_TEMA, tema)
    } catch {
      // Aunque no pueda persistirse, el cambio permanece
      // activo durante esta visita.
    }
  },

  alternarTema: () => {
    const siguiente = get().tema === 'claro'
      ? 'oscuro'
      : 'claro'

    get().cambiarTema(siguiente)
  }
}))