import React, { useState } from 'react'
import { sesion } from './api'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ReporteArbol from './pages/ReporteArbol'
import Detalle from './pages/Detalle'
import Consolidado from './pages/Consolidado'
import Comparativo from './pages/Comparativo'
import Importar from './pages/Importar'
import Auditoria from './pages/Auditoria'
import Usuarios from './pages/Usuarios'

const MENU = [
  { id: 'dashboard', label: 'Dashboard', permiso: 'reportes' },
  { grupo: 'Reportes' },
  { id: 'rubro', label: 'Por rubro y cuenta', permiso: 'reportes' },
  { id: 'financiador', label: 'Por financiador', permiso: 'reportes' },
  { id: 'area', label: 'Por área y financiador', permiso: 'reportes' },
  { id: 'region', label: 'Por región', permiso: 'reportes' },
  { id: 'mes', label: 'Por mes', permiso: 'reportes' },
  { id: 'detalle', label: 'Detalle de movimientos', permiso: 'reportes' },
  { id: 'consolidado', label: 'Resumen consolidado', permiso: 'reportes' },
  { id: 'comparativo', label: 'Comparativo por gestión', permiso: 'reportes' },
  { grupo: 'Administración' },
  { id: 'importar', label: 'Importar datos', permiso: 'importar' },
  { id: 'auditoria', label: 'Auditoría e integridad', permiso: 'auditoria' },
  { id: 'usuarios', label: 'Usuarios', permiso: 'usuarios' },
]

export default function App() {
  const [usuario, setUsuario] = useState(sesion.usuario)
  const [vista, setVista] = useState('dashboard')

  if (!usuario || !sesion.token) return <Login onLogin={setUsuario} />

  const puede = (p) => usuario.permisos?.includes(p)
  const salir = () => { sesion.cerrar(); setUsuario(null) }

  const pagina = () => {
    if (['rubro', 'financiador', 'area', 'region', 'mes'].includes(vista)) return <ReporteArbol key={vista} tipo={vista} puede={puede} />
    switch (vista) {
      case 'detalle': return <Detalle puede={puede} />
      case 'consolidado': return <Consolidado puede={puede} />
      case 'comparativo': return <Comparativo />
      case 'importar': return <Importar />
      case 'auditoria': return <Auditoria />
      case 'usuarios': return <Usuarios />
      default: return <Dashboard irA={setVista} />
    }
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="marca">
          <div className="logo">SICOP</div>
          <small>Control Presupuestario y Ejecución Financiera</small>
        </div>
        <nav>
          {MENU.map((m, i) => m.grupo
            ? <div key={i} className="grupo">{m.grupo}</div>
            : puede(m.permiso) && (
              <button key={m.id} className={vista === m.id ? 'activo' : ''} onClick={() => setVista(m.id)}>{m.label}</button>
            ))}
        </nav>
        <div className="usuario">
          <div><b>{usuario.nombre}</b></div>
          <small>{usuario.username} · {usuario.rol}</small>
          <button className="link" onClick={salir}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="contenido">{pagina()}</main>
    </div>
  )
}
