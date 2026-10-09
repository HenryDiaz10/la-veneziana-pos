// Definimos el componente principal de la aplicación.
// Un componente es una función que devuelve lo que React mostrará.
function App() {
  // Devolvemos JSX: una sintaxis que permite describir la interfaz
  // con etiquetas similares a HTML dentro de JavaScript.
  return (
    // main identifica el contenido principal de la página.
    <main>
      {/* h1 muestra el título principal de la pantalla. */}
      <h1>Pizzería La Veneziana</h1>

      {/* Mostramos un mensaje para comprobar que React funciona. */}
      <p>La interfaz del sistema está funcionando.</p>
    </main>
  )
}

// Exportamos el componente para que main.jsx pueda importarlo
// y mostrarlo dentro de la página.
export default App