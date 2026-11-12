const BASE = import.meta.env.VITE_API_URL || ''

export const sesion = {
  get token() { return localStorage.getItem('sicop_token') },
  get usuario() { try { return JSON.parse(localStorage.getItem('sicop_usuario')) } catch { return null } },
  guardar(token, usuario) {
    localStorage.setItem('sicop_token', token)
    localStorage.setItem('sicop_usuario', JSON.stringify(usuario))
  },
  cerrar() {
    localStorage.removeItem('sicop_token')
    localStorage.removeItem('sicop_usuario')
  },
}

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  if (sesion.token) headers.Authorization = `Bearer ${sesion.token}`
  const r = await fetch(BASE + path, { ...opts, headers })
  if (r.status === 401) {
    sesion.cerrar()
    window.location.reload()
  }
  if (!r.ok) {
    let msg = r.statusText
    try { msg = (await r.json()).detail || msg } catch {}
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return r
}

export const qs = (obj) => {
  const p = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, Array.isArray(v) ? v.join(',') : v)
  })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = {
  get: async (path) => (await req(path)).json(),
  post: async (path, body) => (await req(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })).json(),
  patch: async (path) => (await req(path, { method: 'PATCH' })).json(),
  upload: async (path, form) => (await req(path, { method: 'POST', body: form })).json(),
  login: async (username, password) => {
    const body = new URLSearchParams({ username, password })
    return (await req('/api/auth/login', { method: 'POST', body })).json()
  },
  descargar: async (path) => {
    const r = await req(path)
    const blob = await r.blob()
    const cd = r.headers.get('Content-Disposition') || ''
    const nombre = (cd.match(/filename="(.+)"/) || [])[1] || 'reporte'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    a.click()
    URL.revokeObjectURL(url)
  },
}

export const bs = (v) => v == null ? '—' : v.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const pct = (v) => v == null ? '—' : `${(v * 100).toFixed(1)}%`
export const compacto = (v) => v == null ? '' : Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)} M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(0)} k` : v.toFixed(0)
