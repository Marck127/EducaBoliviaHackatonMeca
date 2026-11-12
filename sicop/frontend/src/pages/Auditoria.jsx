import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function Auditoria() {
  const [log, setLog] = useState([])
  const [ver, setVer] = useState(null)
  const [anclajes, setAnclajes] = useState([])
  const [verificando, setVerificando] = useState(false)

  const cargar = () => {
    api.get('/api/auditoria?limite=100').then(setLog)
    api.get('/api/auditoria/anclajes').then(setAnclajes)
  }
  useEffect(() => { cargar() }, [])

  const verificar = async () => {
    setVerificando(true)
    try { setVer(await api.get('/api/auditoria/verificar')) } finally { setVerificando(false) }
  }
  const anclar = async () => {
    try { await api.post('/api/auditoria/anclajes', {}); cargar() } catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div className="encabezado">
        <h1>Auditoría e integridad (cadena de hashes)</h1>
        <div className="acciones">
          <button className="primario" onClick={verificar} disabled={verificando}>{verificando ? 'Verificando…' : 'Verificar integridad'}</button>
          <button onClick={anclar}>Generar anclaje blockchain</button>
        </div>
      </div>
      <div className="tarjeta">
        <p className="muted">Cada registro de auditoría guarda el SHA-256 del registro anterior; cada movimiento importado tiene su hash y todos forman una raíz Merkle. Si alguien modifica un dato directamente en la base de datos, la verificación lo detecta y señala la fila exacta del Excel. El hash raíz se puede anclar en una blockchain pública (OpenTimestamps sobre Bitcoin) como prueba externa con fecha.</p>
      </div>
      {ver && (
        <div className={`tarjeta ${ver.integro ? 'ok' : 'mal'}`}>
          <h3>{ver.integro ? '✔ Sistema íntegro' : '✖ Se detectaron alteraciones'}</h3>
          <p>Cadena de auditoría: {ver.cadena_auditoria.integra ? `íntegra (${ver.cadena_auditoria.registros} registros)` : `ROTA en el registro #${ver.cadena_auditoria.falla_en_id} — ${ver.cadena_auditoria.motivo}`}</p>
          {ver.datos_financieros.map((d) => (
            <div key={d.gestion}>
              <p>Datos financieros gestión {d.gestion}: {d.integra ? `íntegros (${d.movimientos} movimientos)` : 'ALTERADOS'}</p>
              {!d.integra && d.alterados?.length > 0 && <p>Movimientos alterados: {d.alterados.map((a) => `#${a.id} (fila Excel ${a.fila_excel})`).join(', ')}</p>}
              <p className="hash">Raíz registrada: {d.merkle_root_registrado}<br />Raíz actual: {d.merkle_root_actual}</p>
            </div>
          ))}
        </div>
      )}
      {anclajes.length > 0 && (
        <div className="tarjeta">
          <h3>Anclajes</h3>
          <table className="tabla">
            <thead><tr><th>#</th><th>Fecha</th><th>Red</th><th>Estado</th><th>Hash raíz</th><th>Comando para publicar</th></tr></thead>
            <tbody>{anclajes.map((a) => (
              <tr key={a.id}><td>{a.id}</td><td>{new Date(a.fecha + 'Z').toLocaleString('es-BO')}</td><td>{a.red}</td>
                <td><span className="chip naranja">{a.estado}</span></td><td className="hash">{a.hash_raiz.slice(0, 20)}…</td><td className="hash">{a.comando}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="tarjeta sin-padding scroll">
        <table className="tabla">
          <thead><tr><th>#</th><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th><th>Hash anterior</th><th>Hash</th></tr></thead>
          <tbody>{log.map((a) => (
            <tr key={a.id}><td>{a.id}</td><td>{new Date(a.fecha + 'Z').toLocaleString('es-BO')}</td><td>{a.usuario}</td><td><span className="chip">{a.accion}</span></td>
              <td><small>{JSON.stringify(a.detalle).slice(0, 90)}</small></td><td className="hash">{a.hash_anterior.slice(0, 10)}…</td><td className="hash">{a.hash.slice(0, 10)}…</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
