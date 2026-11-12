import React, { useEffect, useState } from 'react'
import { api, qs, bs } from '../api'
import Filtros from '../components/Filtros'

export default function Detalle({ puede }) {
  const [f, setF] = useState({})
  const [buscar, setBuscar] = useState('')
  const [q, setQ] = useState('')
  const [pagina, setPagina] = useState(1)
  const [d, setD] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { setPagina(1) }, [f, q])
  useEffect(() => {
    api.get('/api/reportes/detalle' + qs({ ...f, buscar: q, pagina, por_pagina: 50 })).then(setD).catch((e) => setError(e.message))
  }, [f, q, pagina])

  const exportar = (formato) => api.descargar(`/api/reportes/detalle/${formato}` + qs({ ...f, buscar: q })).catch((e) => alert(e.message))
  const paginas = d ? Math.max(1, Math.ceil(d.total / d.por_pagina)) : 1

  if (error) return <div className="error">{error}</div>
  return (
    <div>
      <div className="encabezado">
        <h1>Detalle de movimientos</h1>
        {puede('exportar') && <div className="acciones"><button onClick={() => exportar('excel')}>Excel</button><button onClick={() => exportar('pdf')}>PDF</button></div>}
      </div>
      <Filtros valor={f} onChange={setF} />
      <form className="barra" onSubmit={(e) => { e.preventDefault(); setQ(buscar) }}>
        <input className="buscar" placeholder="Buscar en referencia, cuenta contable o código…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        <button>Buscar</button>
        {d && <span className="muted">{d.total} movimientos · Total Bs {bs(d.total_bs)} · USD {bs(d.total_usd)}</span>}
      </form>
      {d && (
        <div className="tarjeta sin-padding scroll">
          <table className="tabla detalle">
            <thead><tr><th>Fecha</th><th>Comp.</th><th>Región</th><th>Financiador</th><th>Rubro / Cuenta</th><th>Área</th><th>Referencia</th>
              <th className="num">Debe Bs</th><th className="num">Debe USD</th><th className="num">Tasa</th></tr></thead>
            <tbody>
              {d.items.map((m) => (
                <tr key={m.id}>
                  <td>{m.fecha ? m.fecha.split('-').reverse().join('/') : ''}</td>
                  <td>{m.tipo_comprobante}-{m.numero}</td>
                  <td>{m.region}</td><td>{m.financiador}</td>
                  <td><div>{m.rubro}</div><small className="muted">{m.cuenta}</small></td>
                  <td><small>{m.area}</small></td>
                  <td className="ref">{m.referencia}<br /><small className="muted">{m.codigo_contable} {m.nombre_contable}</small></td>
                  <td className="num">{bs(m.debe_bs)}</td><td className="num">{bs(m.debe_usd)}</td><td className="num">{m.tasa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="paginacion">
        <button disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>‹ Anterior</button>
        <span>Página {pagina} de {paginas}</span>
        <button disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Siguiente ›</button>
      </div>
    </div>
  )
}
