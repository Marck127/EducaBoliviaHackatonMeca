import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api, qs, bs, pct, compacto } from '../api'
import Filtros, { catalogos } from '../components/Filtros'

const COLORES = ['#9DB4CF', '#1F3A5F', '#E07A1F', '#4C8C6B']
const DIMS = [['rubro', 'Rubro'], ['financiador', 'Financiador'], ['region', 'Región'], ['area', 'Área'], ['mes', 'Mes']]

export default function Comparativo() {
  const [dim, setDim] = useState('rubro')
  const [gest, setGest] = useState([])
  const [disp, setDisp] = useState([])
  const [f, setF] = useState({})
  const [d, setD] = useState(null)

  useEffect(() => { catalogos().then((c) => { setDisp(c.gestiones); setGest(c.gestiones) }) }, [])
  useEffect(() => {
    if (!gest.length) return
    api.get('/api/comparativo' + qs({ ...f, dimension: dim, gestiones: gest })).then(setD)
  }, [dim, gest, f])

  const toggle = (g) => setGest(gest.includes(g) ? gest.filter((x) => x !== g) : [...gest, g].sort())
  const chart = d?.filas.map((r) => ({ label: r.label, ...Object.fromEntries(d.gestiones.map((g) => [String(g), r.gestiones[g]?.ejecucion || 0])) }))

  return (
    <div>
      <div className="encabezado"><h1>Comparativo de ejecución por gestión</h1></div>
      <div className="barra">
        <label>Agrupar por <select value={dim} onChange={(e) => setDim(e.target.value)}>{DIMS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <span className="muted">Gestiones:</span>
        {disp.map((g) => <label key={g} className="check"><input type="checkbox" checked={gest.includes(g)} onChange={() => toggle(g)} />{g}</label>)}
        {disp.length < 2 && <span className="muted">· Importe otra gestión para comparar</span>}
      </div>
      <Filtros valor={f} onChange={setF} ocultar={['gestion', dim]} />
      {d && (
        <>
          <div className="tarjeta">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickFormatter={(s) => s.length > 16 ? s.slice(0, 15) + '…' : s} />
                <YAxis tickFormatter={compacto} fontSize={11} />
                <Tooltip formatter={(v) => bs(v)} /><Legend />
                {d.gestiones.map((g, i) => <Bar isAnimationActive={false} key={g} dataKey={String(g)} name={`Ejecutado ${g}`} fill={COLORES[i % COLORES.length]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="tarjeta sin-padding scroll">
            <table className="tabla">
              <thead>
                <tr><th rowSpan={2}></th>{d.gestiones.map((g) => <th key={g} colSpan={3} className="centro">{g}</th>)}{d.gestiones.length > 1 && <th rowSpan={2} className="num">Var. ejec.</th>}</tr>
                <tr>{d.gestiones.map((g) => <React.Fragment key={g}><th className="num">Vigente</th><th className="num">Ejecución</th><th className="num">%</th></React.Fragment>)}</tr>
              </thead>
              <tbody>{d.filas.map((r) => {
                const g0 = r.gestiones[d.gestiones[0]]?.ejecucion || 0
                const gN = r.gestiones[d.gestiones[d.gestiones.length - 1]]?.ejecucion || 0
                return (
                  <tr key={r.id}><td>{r.label}</td>
                    {d.gestiones.map((g) => <React.Fragment key={g}><td className="num">{bs(r.gestiones[g]?.vigente)}</td><td className="num">{bs(r.gestiones[g]?.ejecucion)}</td><td className="num">{pct(r.gestiones[g]?.pct)}</td></React.Fragment>)}
                    {d.gestiones.length > 1 && <td className="num">{g0 ? pct((gN - g0) / g0) : '—'}</td>}
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
