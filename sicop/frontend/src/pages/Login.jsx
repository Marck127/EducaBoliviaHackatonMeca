import React, { useState } from 'react'
import { api, sesion } from '../api'

export default function Login({ onLogin }) {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    try {
      const r = await api.login(u, p)
      sesion.guardar(r.access_token, r.usuario)
      onLogin(r.usuario)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login">
      <form onSubmit={enviar} className="tarjeta">
        <div className="logo grande">SICOP</div>
        <p className="muted">Sistema Web de Control Presupuestario y Ejecución Financiera</p>
        <label>Usuario<input value={u} onChange={(e) => setU(e.target.value)} autoFocus required /></label>
        <label>Contraseña<input type="password" value={p} onChange={(e) => setP(e.target.value)} required /></label>
        {error && <div className="error">{error}</div>}
        <button className="primario" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </div>
  )
}
