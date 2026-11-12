import React, { useEffect, useState } from 'react'
import { api, bs } from '../api'
import { invalidarCatalogos } from '../components/Filtros'

export default function Importar() {
  const [archivo, setArchivo] = useState(null)
  const [gestion, setGestion] = useState('')
  const [res, setRes] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [historial, setHistorial] = useState([])

  const cargar = () => api.get('/api/importaciones').then(setHistorial)
  useEffect(() => { cargar() }, [])

  const enviar = async (e) => {
    e.preventDefault()
    if (!archivo) return
    setCargando(true); setError(''); setRes(null)
    const fd = new FormData()
    fd.append('archivo_xlsx', archivo)
    if (gestion) fd.append('gestion', gestion)
    try {
      setRes(await api.upload('/api/importaciones', fd))
      invalidarCatalogos()
      cargar()
    } catch (err) { setError(err.message) } finally { setCargando(false) }
  }

  return (
    <div>
      <div className="encabezado"><h1>Importar datos del sistema contable</h1></div>
      <form className="tarjeta form" onSubmit={enviar}>
        <p className="muted">Suba el Excel exportado del sistema contable (hoja <b>BD</b>). Si la gestión ya existe, sus datos se reemplazan y la importación anterior queda en el historial.</p>
        <label>Archivo Excel<input type="file" accept=".xlsx,.xlsm,.xls" onChange={(e) => setArchivo(e.target.files[0])} required /></label>
        <label>Gestión (opcional, se deduce de las fechas)<input type="number" min="2000" max="2100" value={gestion} onChange={(e) => setGestion(e.target.value)} placeholder="2026" /></label>
        <button className="primario" disabled={cargando}>{cargando ? 'Procesando…' : 'Importar'}</button>
        {error && <div className="error">{error}</div>}
      </form>
      {res && (
        <div className="tarjeta ok">
          <h3>Importación correcta — gestión {res.gestion}</h3>
          <table className="tabla resumen-total"><tbody>
            <tr><td>Filas de presupuesto inicial</td><td className="num">{res.filas_presupuesto_inicial}</td></tr>
            <tr><td>Filas de modificaciones</td><td className="num">{res.filas_modificaciones}</td></tr>
            <tr><td>Movimientos</td><td className="num">{res.filas_movimientos}</td></tr>
            <tr><td>Presupuesto inicial</td><td className="num">{bs(res.totales.presupuesto_inicial)}</td></tr>
            <tr><td>Ajustes mensuales</td><td className="num">{bs(res.totales.ajustes_mensuales)}</td></tr>
            <tr><td>Presupuesto asociado a movimientos</td><td className="num">{bs(res.totales.asociado_a_movimientos)}</td></tr>
            <tr className="fuerte"><td>Presupuesto vigente</td><td className="num">{bs(res.totales.presupuesto_vigente)}</td></tr>
            <tr className="fuerte"><td>Ejecución</td><td className="num">{bs(res.totales.ejecucion)}</td></tr>
            <tr><td>SHA-256 del archivo</td><td className="hash">{res.sha256_archivo}</td></tr>
            <tr><td>Raíz Merkle de movimientos</td><td className="hash">{res.merkle_root}</td></tr>
          </tbody></table>
        </div>
      )}
      <div className="tarjeta">
        <h3>Historial de importaciones</h3>
        <table className="tabla">
          <thead><tr><th>#</th><th>Fecha</th><th>Gestión</th><th>Archivo</th><th className="num">Movimientos</th><th>Estado</th><th>Raíz Merkle</th></tr></thead>
          <tbody>{historial.map((h) => (
            <tr key={h.id}><td>{h.id}</td><td>{new Date(h.fecha + 'Z').toLocaleString('es-BO')}</td><td>{h.gestion}</td><td>{h.archivo}</td>
              <td className="num">{h.filas_movimientos}</td><td>{h.vigente ? <span className="chip verde">Vigente</span> : <span className="chip">Reemplazada</span>}</td>
              <td className="hash">{h.merkle_root.slice(0, 16)}…</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
