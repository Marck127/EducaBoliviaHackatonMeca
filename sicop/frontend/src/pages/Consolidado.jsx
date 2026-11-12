import React, { useEffect, useState } from 'react'
import { api, qs, bs, pct } from '../api'
import Filtros from '../components/Filtros'

const SECCIONES = [['rubro', 'Por rubro'], ['financiador', 'Por financiador'], ['region', 'Por región'], ['area', 'Por área'], ['mes', 'Por mes']]

function Tabla({ filas }) {
  return (
    <table className="tabla">
      <thead><tr><th></th><th className="num">Vigente</th><th className="num">Ejecución</th><th className="num">Saldo</th><th className="num">%</th></tr></thead>
      <tbody>{filas.map((x) => (
        <tr key={x.id}><td>{x.label}</td><td className="num">{bs(x.vigente)}</td><td className="num">{bs(x.ejecucion)}</td>
          <td className="num">{bs(x.saldo)}</td><td className="num">{pct(x.pct)}</td></tr>
      ))}</tbody>
    </table>
  )
}

export default function Consolidado({ puede }) {
  const [f, setF] = useState({})
  const [d, setD] = useState(null)
  useEffect(() => { setD(null); api.get('/api/reportes/resumen' + qs(f)).then(setD) }, [f])
  const exportar = (formato) => api.descargar(`/api/reportes/consolidado/${formato}` + qs(f)).catch((e) => alert(e.message))
  const t = d?.totales

  return (
    <div>
      <div className="encabezado">
        <h1>Resumen general consolidado</h1>
        {puede('exportar') && <div className="acciones"><button onClick={() => exportar('excel')}>Excel</button><button onClick={() => exportar('pdf')}>PDF</button></div>}
      </div>
      <Filtros valor={f} onChange={setF} />
      {!d ? <div className="muted">Cargando…</div> : (
        <>
          <div className="tarjeta">
            <table className="tabla resumen-total">
              <tbody>
                <tr><td>Presupuesto inicial</td><td className="num">{bs(t.ppto_inicial)}</td></tr>
                <tr><td>(+) Modificaciones presupuestarias</td><td className="num">{bs(t.modificaciones)}</td></tr>
                <tr className="sub"><td>&nbsp;&nbsp;&nbsp;de las cuales: asignadas después de ejecutar</td><td className="num">{bs(t.sin_ppto_previo)}</td></tr>
                <tr className="fuerte"><td>Presupuesto vigente</td><td className="num">{bs(t.vigente)}</td></tr>
                <tr><td>(−) Ejecución</td><td className="num">{bs(t.ejecucion)}</td></tr>
                <tr className="fuerte"><td>Saldo por ejecutar</td><td className="num">{bs(t.saldo)}</td></tr>
                <tr><td>% de ejecución</td><td className="num">{pct(t.pct)}</td></tr>
                <tr><td>Ejecución equivalente en USD</td><td className="num">{bs(t.ejecucion_usd)}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="graficos">
            {SECCIONES.map(([k, titulo]) => <div className="tarjeta" key={k}><h3>{titulo}</h3><Tabla filas={d[k]} /></div>)}
          </div>
        </>
      )}
    </div>
  )
}
