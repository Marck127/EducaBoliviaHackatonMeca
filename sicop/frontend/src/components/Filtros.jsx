import React, { useEffect, useState } from 'react'
import { api } from '../api'

let cache = null
export async function catalogos() {
  if (!cache) cache = await api.get('/api/catalogos')
  return cache
}
export function invalidarCatalogos() { cache = null }

const CAMPOS = [
  ['gestion', 'Gestión', 'gestiones'],
  ['financiador', 'Financiador', 'financiadores'],
  ['region', 'Región', 'regiones'],
  ['area', 'Área', 'areas'],
  ['rubro', 'Rubro', 'rubros'],
  ['cuenta', 'Cuenta', 'cuentas'],
  ['mes', 'Mes', 'meses'],
]

export default function Filtros({ valor, onChange, ocultar = [] }) {
  const [cat, setCat] = useState(null)
  useEffect(() => { catalogos().then(setCat) }, [])
  if (!cat) return <div className="filtros muted">Cargando filtros…</div>

  const set = (k, v) => {
    const n = { ...valor, [k]: v }
    if (k === 'rubro') n.cuenta = ''
    onChange(n)
  }
  const activos = Object.values(valor).filter(Boolean).length

  return (
    <div className="filtros">
      {CAMPOS.filter(([k]) => !ocultar.includes(k)).map(([k, label, lista]) => {
        let opciones = cat[lista].map((o) => typeof o === 'number' ? { id: o, nombre: String(o) } : o)
        if (k === 'cuenta' && valor.rubro) opciones = opciones.filter((o) => String(o.rubro_id) === String(valor.rubro))
        return (
          <label key={k}>{label}
            <select value={valor[k] || ''} onChange={(e) => set(k, e.target.value)}>
              <option value="">{k === 'gestion' ? 'Última' : 'Todos'}</option>
              {opciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </label>
        )
      })}
      {activos > 0 && <button className="link" onClick={() => onChange({})}>Limpiar ({activos})</button>}
    </div>
  )
}
