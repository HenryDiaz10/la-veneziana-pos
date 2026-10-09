// Mostramos la pantalla inicial con acceso directo mediante teclado.
function App() {
  return (
    // El fragmento agrupa elementos sin agregar un contenedor al HTML.
    <>
      {/* Ocultamos visualmente el enlace hasta que recibe foco.
          Al pulsar Tab, aparecerá en la esquina superior izquierda. */}
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-superficie focus:px-4 focus:py-3 focus:text-texto"
      >
        Saltar al contenido
      </a>

      {/* El id es el destino del enlace.
          tabIndex=-1 permite recibir foco sin añadir una parada de Tab. */}
      <main
        id="contenido-principal"
        tabIndex={-1}
        className="mx-auto max-w-5xl p-4 md:p-8"
      >
        {/* Relacionamos la sección con su título accesible. */}
        <section
          aria-labelledby="titulo-principal"
          className="overflow-hidden rounded-xl border border-borde bg-superficie"
        >
          {/* Conservamos texto oscuro sobre el dorado de marca. */}
          <header className="bg-marca-dorado p-6 text-texto">
            {/* Montserrat para el título, con tamaño adaptable. */}
            <h1
              id="titulo-principal"
              className="font-titulo text-2xl font-bold md:text-3xl"
            >
              Pizzería La Veneziana
            </h1>
          </header>

          {/* Inter se hereda de los estilos generales del cuerpo. */}
          <div className="p-6">
            <p className="text-texto-secundario">
              La interfaz del sistema está funcionando.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}

// Exportamos la pantalla para mostrarla desde main.jsx.
export default App  