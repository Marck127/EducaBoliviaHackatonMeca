import React, { useEffect, useState } from 'react'
import { api } from '../api'

const VACIO = { username: '', nombre: '', password: '', rol: 'tecnico' }

export default function Usuarios() {
  const [lista, setLista] = useState([])
  const [n, setN] = useState(VACIO)
  const [msg, setMsg] = useState('')
  const cargar = () => api.get('/api/usuarios').then(setLista)
  useEffect(() => { cargar() }, [])

  const crear = async (e) => {
    e.preventDefault()
    try { await api.post('/api/usuarios', n); setN(VACIO); setMsg('Usuario creado'); cargar() } catch (err) { setMsg(err.message) }
  }
  const estado = async (u) => {
    try { await api.patch(`/api/usuarios/${u.id}?activo=${!u.activo}`); cargar() } catch (err) { alert(err.message) }
  }

  return (
    <div>
      <div className="encabezado"><h1>Usuarios y roles</h1></div>
      <div className="graficos">
        <div className="tarjeta">
          <table className="tabla">
            <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>{lista.map((u) => (
              <tr key={u.id}><td>{u.username}</td><td>{u.nombre}</td><td><span className="chip">{u.rol}</span></td>
                <td>{u.activo ? 'Activo' : 'Inactivo'}</td><td><button className="link" onClick={() => estado(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button></td></tr>
            ))}</tbody>
          </table>
          <p className="muted"><b>admin</b>: todo · <b>tecnico</b>: reportes, exportación e importación · <b>consulta</b>: solo ver reportes</p>
        </div>
        <form className="tarjeta form" onSubmit={crear}>
          <h3>Nuevo usuario</h3>
          <label>Usuario<input value={n.username} onChange={(e) => setN({ ...n, username: e.target.value })} required /></label>
          <label>Nombre<input value={n.nombre} onChange={(e) => setN({ ...n, nombre: e.target.value })} required /></label>
          <label>Contraseña (mín. 8)<input type="password" value={n.password} onChange={(e) => setN({ ...n, password: e.target.value })} required minLength={8} /></label>
          <label>Rol<select value={n.rol} onChange={(e) => setN({ ...n, rol: e.target.value })}><option>admin</option><option>tecnico</option><option>consulta</option></select></label>
          <button className="primario">Crear</button>
          {msg && <div className="muted">{msg}</div>}
        </form>
      </div>
    </div>
  )
}
