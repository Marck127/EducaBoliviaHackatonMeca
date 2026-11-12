import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LineChart, Line,
  PieChart, Pie, Cell, ComposedChart } from 'recharts'
import { api, qs, bs, pct, compacto } from '../api'
import Filtros from '../components/Filtros'

const C = { vigente: '#9DB4CF', ejecucion: '#1F3A5F', acum: '#E07A1F' }
const PIE = ['#1F3A5F', '#E07A1F', '#4C8C6B', '#9B59B6', '#C0392B', '#7F8C8D']

const corto = (s) => (s.length > 18 ? s.slice(0, 17) + '…' : s)
const tip = (v) => bs(v)

function KPI({ titulo, valor, sub, tono }) {
  return (
    <div className={`kpi ${tono || ''}`}>
      <div className="kpi-t">{titulo}</div>
      <div className="kpi-v">{valor}</div>
      {sub && <div className="kpi-s">{sub}</div>}
    </div>
  )
}

export default function Dashboard({ irA }) {
  const [f, setF] = useState({})
  const [d, setD] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setD(null)
    api.get('/api/reportes/resumen' + qs(f)).then(setD).catch((e) => setError(e.message))
  }, [f])

  if (error) return <div className="error">{error}</div>
  const t = d?.totales

  return (
    <div>
      <div className="encabezado">
        <h1>Dashboard de ejecución presupuestaria</h1>
        <span className="muted">Expresado en bolivianos</span>
      </div>
      <Filtros valor={f} onChange={setF} />
      {!d ? <div className="muted">Cargando…</div> : t.vigente === 0 && t.ejecucion === 0 ? (
        <div className="tarjeta">No hay datos. <button className="link" onClick={() => irA('importar')}>Importar archivo</button></div>
      ) : (
        <>
          <div className="kpis">
            <KPI titulo="Presupuesto vigente" valor={bs(t.vigente)} sub={`Inicial ${bs(t.ppto_inicial)} + modif. ${bs(t.modificaciones)}`} />
            <KPI titulo="Ejecutado" valor={bs(t.ejecucion)} sub={`USD ${bs(t.ejecucion_usd)}`} />
            <KPI titulo="Saldo por ejecutar" valor={bs(t.saldo)} />
            <KPI titulo="% de ejecución" valor={pct(t.pct)} tono={t.pct > 1 ? 'malo' : ''}>
            </KPI>
            <KPI titulo="Presupuesto asignado después de ejecutar" valor={bs(d.control.presupuesto_asignado_despues_de_ejecutar)}
              sub={`${pct(d.control.pct_del_vigente)} del vigente — control interno`} tono="alerta" />
          </div>

          <div className="graficos">
            <div className="tarjeta">
              <h3>Presupuesto vs ejecución por rubro</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={d.rubro}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={corto} fontSize={11} />
                  <YAxis tickFormatter={compacto} fontSize={11} />
                  <Tooltip formatter={tip} />
                  <Legend />
                  <Bar isAnimationActive={false} dataKey="vigente" name="Vigente" fill={C.vigente} />
                  <Bar isAnimationActive={false} dataKey="ejecucion" name="Ejecutado" fill={C.ejecucion} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="tarjeta">
              <h3>Ejecución mensual y acumulada</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={d.mes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={(s) => s.slice(0, 3)} fontSize={11} />
                  <YAxis yAxisId="a" tickFormatter={compacto} fontSize={11} />
                  <YAxis yAxisId="b" orientation="right" tickFormatter={compacto} fontSize={11} />
                  <Tooltip formatter={tip} />
                  <Legend />
                  <Bar isAnimationActive={false} yAxisId="a" dataKey="ejecucion" name="Ejecutado del mes" fill={C.ejecucion} />
                  <Line isAnimationActive={false} yAxisId="b" dataKey="ejecucion_acumulada" name="Acumulado" stroke={C.acum} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="tarjeta">
              <h3>% de ejecución por financiador</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.financiador} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={compacto} fontSize={11} />
                  <YAxis type="category" dataKey="label" width={110} fontSize={11} />
                  <Tooltip formatter={tip} />
                  <Legend />
                  <Bar isAnimationActive={false} dataKey="vigente" name="Vigente" fill={C.vigente} />
                  <Bar isAnimationActive={false} dataKey="ejecucion" name="Ejecutado" fill={C.ejecucion} />
                </BarChart>
              </ResponsiveContainer>
              <table className="mini">
                <tbody>{d.financiador.map((x) => <tr key={x.id}><td>{x.label}</td><td className="num">{pct(x.pct)}</td></tr>)}</tbody>
              </table>
            </div>

            <div className="tarjeta">
              <h3>Ejecución por región</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie isAnimationActive={false} data={d.region} dataKey="ejecucion" nameKey="label" outerRadius={95}
                    label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}>
                    {d.region.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                  </Pie>
                  <Tooltip formatter={tip} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="tarjeta ancho">
              <h3>Ejecución por área</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.area}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={corto} fontSize={10} interval={0} />
                  <YAxis tickFormatter={compacto} fontSize={11} />
                  <Tooltip formatter={tip} />
                  <Legend />
                  <Bar isAnimationActive={false} dataKey="vigente" name="Vigente" fill={C.vigente} />
                  <Bar isAnimationActive={false} dataKey="ejecucion" name="Ejecutado" fill={C.ejecucion} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="tarjeta">
            <h3>Alertas de control ({d.alertas.length})</h3>
            {d.alertas.length === 0 ? (
              <p className="muted">Ninguna cuenta supera su presupuesto planificado (inicial + ajustes, sin contar el presupuesto asignado después de ejecutar).</p>
            ) : (
              <table className="tabla">
                <thead><tr><th>Tipo</th><th>Rubro</th><th>Cuenta</th><th className="num">Planificado</th><th className="num">Ejecutado</th><th className="num">Exceso</th></tr></thead>
                <tbody>{d.alertas.map((a, i) => (
                  <tr key={i}><td><span className={`chip ${a.tipo === 'SIN_PRESUPUESTO' ? 'rojo' : 'naranja'}`}>{a.tipo.replace('_', ' ')}</span></td>
                    <td>{a.rubro}</td><td>{a.cuenta}</td><td className="num">{bs(a.planificado)}</td>
                    <td className="num">{bs(a.ejecucion)}</td><td className="num">{bs(a.exceso)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
