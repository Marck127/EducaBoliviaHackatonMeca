import { useState } from 'react'
import { CONFIG } from '../config.js'
import { Boton, Campo, claseCampo } from '../componentes/Ui.jsx'

const DESCRIPCION_ROL = {
  admin: 'Ve todo, administra usuarios y gestiones',
  tecnico: 'Importa el Excel y registra modificaciones',
  lector: 'Consulta y exporta reportes',
}

export default function Login({ datos, onEntrar }) {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const entrar = async (correo, contrasena) => {
    setEnviando(true)
    setError(null)
    try {
      onEntrar(await datos.entrar(correo, contrasena))
    } catch (e) {
      setError(e.message)
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_480px]">
      <section className="relative hidden overflow-hidden bg-tinta text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div>
          <p className="text-[15px] text-white/70">{CONFIG.ORGANIZACION || 'Control presupuestario'}</p>
          <h1 className="mt-6 max-w-xl text-[40px] leading-[1.1] font-semibold tracking-tight">
            Cuánto del presupuesto ya se ejecutó, al día y sin tablas dinámicas.
          </h1>
          <p className="mt-5 max-w-lg text-[16px] text-white/75">
            Sube el Excel del sistema contable, revisa lo que no cuadra antes de aplicarlo y consulta la ejecución
            por rubro, financiador, área, región y mes.
          </p>
        </div>
        {/* Ilustración: barras de presupuesto (claras) y ejecución (sólidas) */}
        <svg viewBox="0 0 520 180" className="mt-10 w-full max-w-xl" aria-hidden>
          {[0.92, 0.66, 0.8, 0.48, 0.72, 0.58].map((p, i) => (
            <g key={i} transform={`translate(0 ${i * 30})`}>
              <rect x="0" y="0" width="500" height="10" rx="5" fill="#ffffff" fillOpacity="0.1" />
              <rect x="0" y="0" width={500 * p * 0.36} height="10" rx="5" fill="#86b6ef" />
              <line x1={500 * 0.75} x2={500 * 0.75} y1="-6" y2="16" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5" />
            </g>
          ))}
        </svg>
      </section>

      <section className="flex items-center justify-center bg-superficie px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h2>
          <p className="mt-1.5 text-sm text-texto-2">
            {datos.modo === 'demo' ? 'Demo sin servidor con los datos del Excel de prueba. Elige un usuario para ver qué puede hacer cada rol.'
              : datos.modo === 'api' ? 'Entra con el usuario que te creó el administrador.'
                : 'Entra con tu usuario de Supabase.'}
          </p>

          {datos.modo === 'demo' ? (
            <ul className="mt-6 space-y-2">
              {datos.usuariosDemo.map((u) => (
                <li key={u.user_id}>
                  <button type="button" onClick={() => entrar(u.email)} disabled={enviando}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-borde-fuerte px-4 py-3 text-left hover:border-serie-1 hover:bg-[#f5f9fe]">
                    <span>
                      <span className="block font-medium">{u.nombre}</span>
                      <span className="block text-[13px] text-texto-2">{DESCRIPCION_ROL[u.rol]}</span>
                    </span>
                    <span className="text-[13px] font-medium text-serie-1">Entrar</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); entrar(email, clave) }}>
              <Campo etiqueta="Correo">
                <input type="email" required autoComplete="username" className={claseCampo} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Campo>
              <Campo etiqueta="Contraseña">
                <input type="password" required autoComplete="current-password" className={claseCampo} value={clave} onChange={(e) => setClave(e.target.value)} />
              </Campo>
              <Boton type="submit" variante="primario" tamano="lg" className="w-full" cargando={enviando}>Entrar</Boton>
            </form>
          )}
          {error && <p className="mt-4 rounded-lg bg-[#fbeaea] px-3 py-2 text-sm text-[#7d1a1a]" role="alert">{error}</p>}
          <p className="mt-8 text-[12.5px] text-texto-3">Conectado a: {datos.etiqueta}</p>
        </div>
      </section>
    </div>
  )
}
