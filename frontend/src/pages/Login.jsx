import { useId, useState } from 'react'
import logoVeneziana from '../assets/logo-veneziana.png'

// Pantalla de ingreso del personal.
function Login() {
  const formularioId = useId()
  const [mostrarPassword, setMostrarPassword] = useState(false)

  const correoId = `${formularioId}-correo`
  const passwordId = `${formularioId}-password`

  // La luz sigue el ratón sin provocar renderizados de React.
  // En pantallas táctiles o con movimiento reducido permanece estática.
  function moverLuz(evento) {
    if (
      evento.pointerType !== 'mouse' ||
      !window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches
    ) {
      return
    }

    const pantalla = evento.currentTarget
    const limites = pantalla.getBoundingClientRect()
    pantalla.style.setProperty('--luz-x', `${evento.clientX - limites.left}px`)
    pantalla.style.setProperty('--luz-y', `${evento.clientY - limites.top}px`)
  }

  function manejarEnvio(evento) {
    // Evitar la navegación y el envío de credenciales por la URL.
    // Conectaremos la autenticación al implementar la sesión.
    evento.preventDefault()
  }

  return (
    <main
      id="contenido-principal"
      tabIndex={-1}
      onPointerMove={moverLuz}
      className="login-screen flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8 lg:py-14"
    >
      <div className="login-layout relative z-10 grid w-full max-w-6xl items-center gap-9 lg:grid-cols-2 lg:gap-16 xl:gap-24">
        {/* El logo conserva su proporción y su transparencia original. */}
        <header className="login-brand flex flex-col items-center text-center">
          <div className="login-logo-stage w-44 sm:w-56 lg:w-full lg:max-w-md">
          <img
            src={logoVeneziana}
            alt="Pizzería La Veneziana"
            width="2048"
            height="2048"
            fetchPriority="high"
            className="login-logo h-auto w-full"
          />
          </div>

          <p className="mt-3 text-base text-slate-200 lg:mt-6 lg:text-xl">
            Cada detalle cuenta.
          </p>

          <div aria-hidden="true" className="login-brand-rule mt-5 h-px w-24" />
        </header>

        <div className="login-form-panel mx-auto w-full max-w-md lg:max-w-none">
        {/* Vidrio translúcido con respaldo oscuro si no hay desenfoque. */}
        <section
          aria-labelledby={`${formularioId}-titulo`}
          className="login-glass rounded-3xl p-6 sm:p-9 lg:p-10"
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-300">
            ACCESO DEL PERSONAL
          </p>

          <h1
            id={`${formularioId}-titulo`}
            className="mt-3 font-marca text-4xl font-semibold text-white sm:text-[2.75rem]"
          >
            La Veneziana
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-200">
            Bienvenido. Ingresa con tu cuenta de empleado.
          </p>

          <form onSubmit={manejarEnvio} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor={correoId}
                className="block text-sm font-semibold text-slate-100"
              >
                Correo electrónico
              </label>

              <div className="relative mt-2">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="login-field-icon pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400"
                >
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              <input
                id={correoId}
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={100}
                placeholder="nombre@ejemplo.com"
                className="login-input min-h-12 w-full rounded-xl border border-white/25 py-3 pr-4 pl-12 text-base text-white placeholder:text-slate-300"
              />
              </div>
            </div>

            <div>
              <label
                htmlFor={passwordId}
                className="block text-sm font-semibold text-slate-100"
              >
                Contraseña
              </label>

              <div className="relative mt-2">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="login-field-icon pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400"
                >
                  <rect x="5" y="10" width="14" height="11" rx="3" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" strokeLinecap="round" />
                </svg>
                <input
                  id={passwordId}
                  name="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="login-input min-h-12 w-full rounded-xl border border-white/25 py-3 pr-24 pl-12 text-base text-white"
                />

                <button
                  type="button"
                  aria-controls={passwordId}
                  aria-pressed={mostrarPassword}
                  aria-label="Mostrar contraseña"
                  onClick={() => {
                    setMostrarPassword(visible => !visible)
                  }}
                  className="absolute inset-y-1 right-1 min-w-20 rounded-lg px-3 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
                >
                  {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit min-h-12 w-full rounded-xl bg-marca-dorado px-4 py-3 text-base font-bold text-texto hover:bg-amber-400"
            >
              <span className="inline-flex items-center justify-center gap-3">
                Ingresar
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="login-submit-arrow size-5"
                >
                  <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </form>

          <p className="mt-6 border-t border-white/15 pt-5 text-center text-sm leading-relaxed text-slate-200">
            ¿Necesitas recuperar tu acceso? Contacta al administrador.
          </p>
        </section>

        <footer className="mt-6 text-center text-xs text-slate-300">
          Sistema de gestión · Acceso exclusivo del personal
        </footer>
        </div>
      </div>
    </main>
  )
}

export default Login
