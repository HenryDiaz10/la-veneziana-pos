import Login from './pages/Login.jsx'

function App() {
  return (
    <>
      {/* Acceso directo al formulario para navegación con teclado. */}
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-superficie focus:px-4 focus:py-3 focus:text-texto"
      >
        Saltar al contenido
      </a>

      <Login />
    </>
  )
}

export default App