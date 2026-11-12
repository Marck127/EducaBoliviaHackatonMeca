import { useState } from 'react'
import { CheckCircle2, FileUp, KeyRound, Lock, LockOpen, RotateCcw, UserPlus } from 'lucide-react'
import { useSesion } from '../componentes/Sesion.jsx'
import { Boton, Campo, Cargando, claseCampo, Insignia, MensajeError, Modal, Panel, Pestanas } from '../componentes/Ui.jsx'
import { fechaHora, num } from '../lib/formato.js'
import { useConsulta } from '../lib/usar.js'

const ROLES = [['admin', 'Admin'], ['tecnico', 'Técnico'], ['lector', 'Lector']]

function Usuarios() {
  const { datos, perfil, version, refrescar, avisar } = useSesion()
  const { datos: lista, error } = useConsulta(() => datos.rpc('listar_usuarios'), [datos, version])
  const [nuevo, setNuevo] = useState(false)
  const [form, setForm] = useState({ email: '', clave: '', rol: 'lector' })
  const [clave, setClave] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)

  const cambiarRol = async (u, rol) => {
    try {
      await datos.rpc('cambiar_rol', { p_user_id: u.user_id, p_rol: rol })
      avisar(`${u.email} ahora es ${ROLES.find((r) => r[0] === rol)[1].toLowerCase()}`)
      refrescar()
    } catch (e) {
      avisar(e.message, 'error')
      refrescar()
    }
  }
  const crear = async () => {
    setEnviando(true)
    setErrorForm(null)
    try {
      await datos.crearUsuario(form)
      avisar(`Usuario ${form.email} creado`)
      setNuevo(false)
      setForm({ email: '', clave: '', rol: 'lector' })
      refrescar()
    } catch (e) {
      setErrorForm(e.message)
    } finally {
      setEnviando(false)
    }
  }
  const restablecer = async () => {
    setEnviando(true)
    setErrorForm(null)
    try {
      await datos.cambiarClave(clave.user_id, clave.nueva)
      avisar(`Contraseña de ${clave.email} cambiada`)
      setClave(null)
    } catch (e) {
      setErrorForm(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Panel titulo="Usuarios y roles" cuerpo="p-0"
      descripcion={datos.modo === 'supabase' ? 'Los usuarios se crean en Supabase (Authentication → Add user). Aquí les asignas el rol.'
        : datos.modo === 'demo' ? 'En la demo hay tres usuarios de ejemplo; los cambios de rol quedan en este navegador.' : 'Crea usuarios y asígnales un rol.'}
      acciones={datos.capacidades.crearUsuarios && <Boton variante="primario" tamano="sm" icono={UserPlus} onClick={() => setNuevo(true)}>Nuevo usuario</Boton>}>
      {error && <div className="p-5"><MensajeError error={error} /></div>}
      {!lista ? <div className="p-5"><Cargando /></div> : (
        <table className="w-full text-[13.5px]">
          <thead className="bg-[#f6f8fa] text-left text-[12.5px] text-texto-2">
            <tr><th scope="col" className="px-5 py-2 font-medium">Correo</th><th scope="col" className="px-3 py-2 font-medium">Rol</th><th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">Desde</th><th scope="col" className="px-5 py-2"><span className="sr-only">Acciones</span></th></tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.user_id} className="border-t border-borde/70">
                <td className="px-5 py-2.5">{u.email}{u.user_id === perfil.user_id && <Insignia className="ml-2">Tú</Insignia>}</td>
                <td className="px-3 py-2.5">
                  <select value={u.rol} onChange={(e) => cambiarRol(u, e.target.value)} aria-label={`Rol de ${u.email}`} className="h-8 rounded-lg border border-borde-fuerte bg-superficie px-2 text-sm">
                    {ROLES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                </td>
                <td className="hidden px-3 py-2.5 text-texto-2 sm:table-cell">{fechaHora(u.creado)}</td>
                <td className="px-5 py-2.5 text-right">
                  {datos.capacidades.crearUsuarios && (
                    <Boton tamano="sm" variante="fantasma" icono={KeyRound} onClick={() => setClave({ ...u, nueva: '' })}>Contraseña</Boton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal abierto={nuevo} titulo="Nuevo usuario" onCerrar={() => setNuevo(false)}
        pie={<><Boton onClick={() => setNuevo(false)}>Cancelar</Boton><Boton variante="primario" onClick={crear} cargando={enviando} disabled={!form.email || form.clave.length < 8}>Crear usuario</Boton></>}>
        <div className="space-y-4">
          <Campo etiqueta="Correo"><input type="email" className={claseCampo} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Campo>
          <Campo etiqueta="Contraseña inicial" ayuda="Al menos 8 caracteres. La persona puede cambiarla al entrar."><input type="text" className={claseCampo} value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} /></Campo>
          <Campo etiqueta="Rol">
            <select className={claseCampo} value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>{ROLES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
          </Campo>
          {errorForm && <p className="text-sm text-critico">{errorForm}</p>}
        </div>
      </Modal>
      <Modal abierto={Boolean(clave)} titulo={clave ? `Nueva contraseña para ${clave.email}` : ''} onCerrar={() => setClave(null)}
        pie={<><Boton onClick={() => setClave(null)}>Cancelar</Boton><Boton variante="primario" onClick={restablecer} cargando={enviando} disabled={(clave?.nueva || '').length < 8}>Cambiar contraseña</Boton></>}>
        <Campo etiqueta="Nueva contraseña" ayuda="Al menos 8 caracteres."><input type="text" className={claseCampo} value={clave?.nueva || ''} onChange={(e) => setClave({ ...clave, nueva: e.target.value })} /></Campo>
        {errorForm && <p className="mt-3 text-sm text-critico">{errorForm}</p>}
      </Modal>
    </Panel>
  )
}

function Gestiones() {
  const { datos, catalogos, refrescar, avisar } = useSesion()
  const [tasas, setTasas] = useState({})
  const guardar = async (g, cambios) => {
    try {
      await datos.rpc('actualizar_gestion', { p_anio: g.anio, ...cambios })
      avisar(`Gestión ${g.anio} actualizada`)
      refrescar()
    } catch (e) {
      avisar(e.message, 'error')
    }
  }
  return (
    <Panel titulo="Gestiones" descripcion="Una gestión cerrada ya no acepta importaciones ni modificaciones. La tasa convierte el presupuesto a dólares." cuerpo="p-0">
      <table className="w-full text-[13.5px]">
        <thead className="bg-[#f6f8fa] text-left text-[12.5px] text-texto-2">
          <tr><th scope="col" className="px-5 py-2 font-medium">Gestión</th><th scope="col" className="px-3 py-2 font-medium">Estado</th><th scope="col" className="px-3 py-2 font-medium">Tasa del presupuesto (Bs por USD)</th><th scope="col" className="px-5 py-2"><span className="sr-only">Acciones</span></th></tr>
        </thead>
        <tbody>
          {catalogos.gestiones.map((g) => (
            <tr key={g.anio} className="border-t border-borde/70">
              <td className="num px-5 py-3 font-semibold">{g.anio}</td>
              <td className="px-3 py-3"><Insignia tono={g.estado === 'abierta' ? 'bien' : 'neutro'}>{g.estado === 'abierta' ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}{g.estado}</Insignia></td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" min="0.01" className={`${claseCampo} num w-28`} value={tasas[g.anio] ?? g.tasa_presupuesto}
                    onChange={(e) => setTasas({ ...tasas, [g.anio]: e.target.value })} aria-label={`Tasa de ${g.anio}`} />
                  {tasas[g.anio] !== undefined && Number(tasas[g.anio]) !== Number(g.tasa_presupuesto) && (
                    <Boton tamano="sm" onClick={() => { guardar(g, { p_tasa: Number(tasas[g.anio]) }); setTasas({ ...tasas, [g.anio]: undefined }) }}>Guardar</Boton>
                  )}
                </div>
              </td>
              <td className="px-5 py-3 text-right">
                <Boton tamano="sm" icono={g.estado === 'abierta' ? Lock : LockOpen} onClick={() => guardar(g, { p_estado: g.estado === 'abierta' ? 'cerrada' : 'abierta' })}>
                  {g.estado === 'abierta' ? 'Cerrar gestión' : 'Reabrir'}
                </Boton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

function Cambios({ antes, despues }) {
  const claves = [...new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})])]
    .filter((k) => JSON.stringify(antes?.[k]) !== JSON.stringify(despues?.[k]))
  if (!claves.length) return null
  const v = (x, k) => (x === null || x === undefined ? '—' : typeof x === 'number' ? (k.includes('monto') || !Number.isInteger(x) ? num(x, 2) : String(x)) : String(x))
  return (
    <ul className="mt-1 space-y-0.5 text-[12.5px] text-texto-2">
      {claves.slice(0, 8).map((k) => (
        <li key={k}><span className="text-texto-3">{k}:</span> {antes ? <><span className="line-through decoration-texto-3/60">{v(antes[k], k)}</span> → </> : null}<span className="text-texto">{despues ? v(despues[k], k) : '(borrado)'}</span></li>
      ))}
    </ul>
  )
}

function Auditoria() {
  const { datos, version } = useSesion()
  const [tabla, setTabla] = useState('')
  const { datos: lista, error } = useConsulta(() => datos.rpc('listar_auditoria', { p_limite: 200, p_tabla: tabla || null }), [datos, tabla, version])
  const OPERACION = { INSERT: 'Creó', UPDATE: 'Cambió', DELETE: 'Borró' }
  return (
    <Panel titulo="Registro de auditoría" descripcion="Quién cambió qué y cuándo. Las importaciones se registran aparte, con su archivo y validaciones."
      acciones={
        <select value={tabla} onChange={(e) => setTabla(e.target.value)} className="h-8 rounded-lg border border-borde-fuerte bg-superficie px-2 text-sm" aria-label="Filtrar por tabla">
          <option value="">Todas las tablas</option>
          {['modificaciones', 'perfiles', 'gestiones', 'presupuestos', 'movimientos', 'financiadores', 'rubros', 'cuentas'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      } cuerpo="p-0">
      {error && <div className="p-5"><MensajeError error={error} /></div>}
      {!lista ? <div className="p-5"><Cargando /></div> : !lista.length ? <p className="px-5 py-4 text-sm text-texto-2">Sin cambios registrados todavía.</p> : (
        <ul className="divide-y divide-borde">
          {lista.map((a) => (
            <li key={a.id} className="flex flex-wrap gap-x-6 gap-y-1 px-5 py-3 text-[13.5px]">
              <span className="num w-36 shrink-0 text-texto-2">{fechaHora(a.fecha)}</span>
              <div className="min-w-0 flex-1">
                <p><span className="font-medium">{a.email || 'Sistema'}</span> {OPERACION[a.operacion]?.toLowerCase() || a.operacion} en <span className="font-medium">{a.tabla}</span> <span className="text-texto-3">#{a.registro}</span></p>
                <Cambios antes={a.antes} despues={a.despues} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function CargaAutomatica() {
  const { datos, catalogos, gestion, refrescar, avisar } = useSesion()
  const [archivo, setArchivo] = useState(null)
  const [modo, setModo] = useState('sincronizar')
  const [gestionArchivo, setGestionArchivo] = useState('')
  const [forzar, setForzar] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)

  const sinServidor = datos.modo === 'supabase' && !datos.capacidades.servidorArchivos

  const ejecutar = async (e) => {
    e.preventDefault()
    if (!archivo && datos.modo !== 'demo') return
    setCargando(true)
    setError(null)
    setResultado(null)
    try {
      const res = await datos.subirExcelAutomatico(archivo, {
        modo,
        gestion: gestionArchivo || undefined,
        forzarConErrores: forzar,
      })
      setResultado(res)
      setArchivo(null)
      const movs = res.resultado?.movimiento?.nuevos ?? 0
      avisar(`Importación #${res.importacion_id} organizada en la base (${num(movs, 0)} movimientos nuevos)`)
      refrescar()
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <Panel
      titulo="Carga y organización automática en base de datos"
      descripcion="Sube el Excel del sistema contable y el servidor normalizará catálogos, presupuestos, movimientos y tipos de cambio directamente sin paso de borrador."
    >
      <form onSubmit={ejecutar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Archivo Excel (.xlsx / .xlsm)" className="sm:col-span-2">
            <input
              type="file"
              accept=".xlsx,.xlsm"
              disabled={datos.modo === 'demo'}
              onChange={(e) => {
                setError(null)
                setArchivo(e.target.files?.[0] || null)
              }}
              className="block w-full rounded-lg border border-borde-fuerte bg-superficie px-3 py-1.5 text-sm text-texto file:mr-3 file:rounded-md file:border-0 file:bg-serie-1 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white hover:file:bg-tinta"
            />
          </Campo>

          <Campo etiqueta="Gestión (opcional)">
            <select
              value={gestionArchivo}
              onChange={(e) => setGestionArchivo(e.target.value)}
              className={claseCampo}
            >
              <option value="">Auto-detectar por fechas</option>
              {[...new Set([...(catalogos.gestiones || []).map((g) => g.anio), new Date().getFullYear(), gestion].filter(Boolean))]
                .sort((a, b) => b - a)
                .map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
            </select>
          </Campo>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-borde bg-fondo/60 px-4 py-3">
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-texto">
              <input
                type="radio"
                name="modoAuto"
                value="sincronizar"
                checked={modo === 'sincronizar'}
                onChange={() => setModo('sincronizar')}
                className="accent-serie-1"
              />
              Sincronizar gestión completa
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-texto">
              <input
                type="radio"
                name="modoAuto"
                value="agregar"
                checked={modo === 'agregar'}
                onChange={() => setModo('agregar')}
                className="accent-serie-1"
              />
              Solo agregar filas nuevas
            </label>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-texto-2">
            <input
              type="checkbox"
              checked={forzar}
              onChange={(e) => setForzar(e.target.checked)}
              className="accent-serie-1"
            />
            Aplicar incluso si existen errores de validación
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Boton
            type="submit"
            variante="primario"
            icono={FileUp}
            cargando={cargando}
            disabled={(!archivo && datos.modo !== 'demo') || sinServidor}
          >
            Cargar y organizar automáticamente
          </Boton>
          {sinServidor && (
            <span className="text-xs text-critico">Falta configurar API_URL en config.js para procesar Excel.</span>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-4">
          <MensajeError error={error} />
        </div>
      )}

      {resultado && (
        <div className="mt-5 rounded-xl border border-serie-1/40 bg-serie-1-pista/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-tinta">
            <CheckCircle2 className="size-4 text-serie-1" />
            <span>
              Importación #{resultado.importacion_id} organizada en la gestión {resultado.gestion} ({resultado.archivo})
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div className="rounded-lg border border-borde bg-superficie p-2.5">
              <dt className="text-texto-3">Presupuestos nuevos</dt>
              <dd className="num mt-0.5 text-sm font-semibold text-tinta">
                {num(resultado.resultado?.presupuesto?.nuevos ?? 0, 0)}
              </dd>
            </div>
            <div className="rounded-lg border border-borde bg-superficie p-2.5">
              <dt className="text-texto-3">Movimientos nuevos</dt>
              <dd className="num mt-0.5 text-sm font-semibold text-tinta">
                {num(resultado.resultado?.movimiento?.nuevos ?? 0, 0)}
              </dd>
            </div>
            <div className="rounded-lg border border-borde bg-superficie p-2.5">
              <dt className="text-texto-3">Sin cambios</dt>
              <dd className="num mt-0.5 text-sm font-semibold text-texto-2">
                {num((resultado.resultado?.presupuesto?.sin_cambio ?? 0) + (resultado.resultado?.movimiento?.sin_cambio ?? 0), 0)}
              </dd>
            </div>
            <div className="rounded-lg border border-borde bg-superficie p-2.5">
              <dt className="text-texto-3">Observaciones</dt>
              <dd className="num mt-0.5 text-sm font-semibold text-texto">
                {num(resultado.validaciones?.length ?? 0, 0)}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Panel>
  )
}

export default function Administracion() {
  const { datos } = useSesion()
  const [pestana, setPestana] = useState('usuarios')
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Pestanas etiqueta="Administración" activa={pestana} onCambiar={setPestana}
          items={[{ clave: 'usuarios', etiqueta: 'Usuarios' }, { clave: 'carga', etiqueta: 'Carga automática' }, { clave: 'gestiones', etiqueta: 'Gestiones' }, { clave: 'auditoria', etiqueta: 'Auditoría' }]} />
        {datos.modo === 'demo' && <Boton tamano="sm" variante="fantasma" icono={RotateCcw} onClick={datos.reiniciar}>Reiniciar la demo</Boton>}
      </div>
      {pestana === 'usuarios' && <Usuarios />}
      {pestana === 'carga' && <CargaAutomatica />}
      {pestana === 'gestiones' && <Gestiones />}
      {pestana === 'auditoria' && <Auditoria />}
    </div>
  )
}
