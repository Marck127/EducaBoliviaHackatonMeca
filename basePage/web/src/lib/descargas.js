// Dentro de un marco (vista previa) el navegador puede bloquear las descargas
export function descargasBloqueadas() {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

export function guardarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// CSV con punto y coma y BOM: Excel en español lo abre bien.
export function aCsv(columnas, filas) {
  const celda = (v) => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lineas = [columnas.map((c) => celda(c.titulo)).join(';')]
  for (const f of filas) lineas.push(columnas.map((c) => celda(typeof c.valor === 'function' ? c.valor(f) : f[c.valor])).join(';'))
  return new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
}

export function nombreArchivo(titulo, ext) {
  const base = titulo.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  const d = new Date()
  const dos = (n) => String(n).padStart(2, '0')
  return `${base || 'reporte'}-${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}.${ext}`
}
