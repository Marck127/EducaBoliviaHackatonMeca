import React, { useEffect, useMemo, useState } from 'react'
import { api, qs, bs, pct } from '../api'
import Filtros from '../components/Filtros'

const NOMBRES = { rubro: 'Rubro', cuenta: 'Cuenta', financiador: 'Financiador', area: 'Área', region: 'Región', mes: 'Mes' }

export default function ReporteArbol({ tipo, puede }) {
  const [f, setF] = useState({})
  const [d, setD] = useState(null)
  const [abiertos, setAbiertos] = useState(new Set())
  const [error, setError] = useState('')
  const [bajando, setBajando] = useState('')

  useEffect(() => {
    setD(null)
    api.get(`/api/reportes/${tipo}` + qs(f)).then((r) => {
      setD(r)
      setAbiertos(new Set(r.arbol.children.map((c) => c.key)))
    }).catch((e) => setError(e.message))
  }, [tipo, f])

  const todos = useMemo(() => {
    const out = []
    const rec = (n) => n.children.forEach((h) => { if (h.children.length) out.push(h); rec(h) })
    if (d) rec(d.arbol)
    return out
  }, [d])

  const toggle = (k) => {
    const s = new Set(abiertos)
    s.has(k) ? s.delete(k) : s.add(k)
    setAbiertos(s)
  }
  const expandirNivel = (nivel) => setAbiertos(new Set(todos.filter((n) => n.nivel < nivel).map((n) => n.key)))

  const exportar = async (formato) => {
    setBajando(formato)
    const profundidad = Math.max(1, ...todos.filter((n) => abiertos.has(n.key)).map((n) => n.nivel + 2))
    try { await api.descargar(`/api/reportes/${tipo}/${formato}` + qs({ ...f, profundidad })) }
    catch (e) { alert(e.message) }
    finally { setBajando('') }
  }

  const filas = []
  const rec = (n) => n.children.forEach((h) => {
    filas.push(h)
    if (abiertos.has(h.key)) rec(h)
  })
  if (d) rec(d.arbol)

  if (error) return <div className="error">{error}</div>

  return (
    <div>
      <div className="encabezado">
        <div>
          <h1>{d?.titulo || 'Reporte'}</h1>
          {d && <span className="muted">Niveles: {d.niveles.map((n) => NOMBRES[n]).join(' → ')} · Expresado en bolivianos</span>}
        </div>
        {puede('exportar') && (
          <div className="acciones">
            <button onClick={() => exportar('excel')} disabled={!!bajando}>{bajando === 'excel' ? '…' : 'Excel'}</button>
            <button onClick={() => exportar('pdf')} disabled={!!bajando}>{bajando === 'pdf' ? '…' : 'PDF'}</button>
          </div>
        )}
      </div>
      <Filtros valor={f} onChange={setF} />
      {d && (
        <div className="barra">
          <span className="muted">Desplegar hasta:</span>
          {d.niveles.map((n, i) => <button key={n} className="chip-btn" onClick={() => expandirNivel(i)}>{NOMBRES[n]}</button>)}
          <span className="muted">· La exportación respeta el nivel desplegado</span>
        </div>
      )}
      {!d ? <div className="muted">Cargando…</div> : (
        <div className="tarjeta sin-padding">
          <table className="tabla arbol">
            <thead>
              <tr><th>Descripción</th><th className="num">Ppto. inicial</th><th className="num">Modificaciones</th>
                <th className="num">Ppto. vigente</th><th className="num">Ejecución</th><th className="num">Saldo</th><th className="num">% Ejec.</th><th></th></tr>
            </thead>
            <tbody>
              {filas.map((n) => (
                <tr key={n.key} className={`nivel-${n.nivel}`}>
                  <td style={{ paddingLeft: 12 + n.nivel * 22 }}>
                    {n.children.length ? <button className="toggle" onClick={() => toggle(n.key)}>{abiertos.has(n.key) ? '▾' : '▸'}</button> : <span className="toggle-vacio" />}
                    {n.label}
                  </td>
                  <td className="num">{bs(n.ppto_inicial)}</td>
                  <td className="num">{bs(n.modificaciones)}</td>
                  <td className="num">{bs(n.vigente)}</td>
                  <td className="num">{bs(n.ejecucion)}</td>
                  <td className={`num ${n.saldo < 0 ? 'neg' : ''}`}>{bs(n.saldo)}</td>
                  <td className="num">{pct(n.pct)}</td>
                  <td className="barra-pct"><div style={{ width: `${Math.min(100, (n.pct || 0) * 100)}%` }} className={n.pct > 1 ? 'exceso' : ''} /></td>
                </tr>
              ))}
              <tr className="total">
                <td>Total general</td><td className="num">{bs(d.arbol.ppto_inicial)}</td><td className="num">{bs(d.arbol.modificaciones)}</td>
                <td className="num">{bs(d.arbol.vigente)}</td><td className="num">{bs(d.arbol.ejecucion)}</td>
                <td className="num">{bs(d.arbol.saldo)}</td><td className="num">{pct(d.arbol.pct)}</td><td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
