import os
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from .db import engine, get_db, Base, SessionLocal
from .models import (Usuario, Financiador, Region, Area, Rubro, Cuenta, Importacion, Auditoria, Anclaje,
                     TipoCambio, Movimiento)
from .security import hash_password, verify_password, crear_token, usuario_actual, requiere, ROLES
from . import reports, exports, audit
from .importer import importar, ErrorImportacion, verificar_movimientos, MESES

app = FastAPI(title="SICOP — Sistema de Control Presupuestario y Ejecución Financiera", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"], expose_headers=["Content-Disposition"])


@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        reports.crear_vista(db)
        if not db.query(Usuario).count():
            for u, n, r in (("admin", "Administrador", "admin"), ("tecnico", "Usuario Técnico", "tecnico"),
                            ("consulta", "Usuario Consulta", "consulta")):
                pw = os.getenv(f"{u.upper()}_PASSWORD", f"{u}123")
                db.add(Usuario(username=u, nombre=n, rol=r, password_hash=hash_password(pw)))
            audit.registrar(db, "sistema", "INICIALIZACION", {"usuarios": ["admin", "tecnico", "consulta"]})
            db.commit()
        seed = os.getenv("SEED_FILE")
        if seed and os.path.exists(seed) and not db.query(Importacion).count():
            with open(seed, "rb") as fh:
                importar(db, fh.read(), os.path.basename(seed), None)


def filtros_q(gestion: Optional[str] = None, financiador: Optional[str] = None, region: Optional[str] = None,
              area: Optional[str] = None, rubro: Optional[str] = None, cuenta: Optional[str] = None,
              mes: Optional[str] = None, db: Session = Depends(get_db)) -> dict:
    out = {}
    if not gestion:
        ultima = db.query(func.max(Importacion.gestion)).filter(Importacion.vigente.is_(True)).scalar()
        gestion = str(ultima) if ultima else None
    for k, v in dict(gestion=gestion, financiador=financiador, region=region, area=area, rubro=rubro,
                     cuenta=cuenta, mes=mes).items():
        if v:
            try:
                out[k] = [int(x) for x in v.split(",") if x.strip() != ""]
            except ValueError:
                raise HTTPException(400, f"Filtro {k} inválido")
    return out


def filtros_texto(db: Session, f: dict) -> str:
    modelos = {"financiador": Financiador, "region": Region, "area": Area, "rubro": Rubro, "cuenta": Cuenta}
    partes = []
    for k, ids in f.items():
        if k == "gestion":
            nombres = [str(i) for i in ids]
        elif k == "mes":
            nombres = [reports.etiqueta_mes(i) for i in ids]
        else:
            nombres = [o.nombre for o in db.query(modelos[k]).filter(modelos[k].id.in_(ids))]
        partes.append(f"{k.capitalize()}: {', '.join(nombres)}")
    return " | ".join(partes)


def archivo(contenido: bytes, nombre: str, tipo: str) -> Response:
    mime = {"xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "pdf": "application/pdf"}
    return Response(contenido, media_type=mime[tipo],
                    headers={"Content-Disposition": f'attachment; filename="{nombre}_{datetime.now():%Y%m%d_%H%M}.{tipo}"'})


@app.get("/api/salud")
def salud(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"estado": "ok"}


@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(Usuario).filter_by(username=form.username, activo=True).first()
    if not u or not verify_password(form.password, u.password_hash):
        audit.registrar(db, form.username, "LOGIN_FALLIDO", {})
        db.commit()
        raise HTTPException(401, "Usuario o contraseña incorrectos")
    audit.registrar(db, u.username, "LOGIN", {})
    db.commit()
    return {"access_token": crear_token(u), "token_type": "bearer",
            "usuario": {"username": u.username, "nombre": u.nombre, "rol": u.rol, "permisos": sorted(ROLES[u.rol])}}


@app.get("/api/auth/yo")
def yo(u: Usuario = Depends(usuario_actual)):
    return {"username": u.username, "nombre": u.nombre, "rol": u.rol, "permisos": sorted(ROLES[u.rol])}


@app.get("/api/catalogos")
def catalogos(db: Session = Depends(get_db), u: Usuario = Depends(requiere("reportes"))):
    gestiones = [g for (g,) in db.query(Importacion.gestion).filter_by(vigente=True).distinct().order_by(Importacion.gestion)]
    return {
        "gestiones": gestiones,
        "financiadores": [{"id": o.id, "nombre": o.nombre} for o in db.query(Financiador).order_by(Financiador.nombre)],
        "regiones": [{"id": o.id, "nombre": o.nombre} for o in db.query(Region).order_by(Region.nombre)],
        "areas": [{"id": o.id, "nombre": o.nombre} for o in db.query(Area).order_by(Area.nombre)],
        "rubros": [{"id": o.id, "nombre": o.nombre} for o in db.query(Rubro).order_by(Rubro.nombre)],
        "cuentas": [{"id": o.id, "nombre": o.nombre, "rubro_id": o.rubro_id} for o in db.query(Cuenta).order_by(Cuenta.nombre)],
        "meses": [{"id": 0, "nombre": "PRESUPUESTO INICIAL"}] + [{"id": i + 1, "nombre": m} for i, m in enumerate(MESES)],
    }


@app.get("/api/reportes/resumen")
def reporte_resumen(f: dict = Depends(filtros_q), db: Session = Depends(get_db), u: Usuario = Depends(requiere("reportes"))):
    return reports.resumen(db, f)


@app.get("/api/reportes/detalle")
def reporte_detalle(f: dict = Depends(filtros_q), buscar: Optional[str] = None, pagina: int = Query(1, ge=1),
                    por_pagina: int = Query(50, ge=1, le=500), db: Session = Depends(get_db),
                    u: Usuario = Depends(requiere("reportes"))):
    return reports.detalle(db, f, buscar, pagina, por_pagina)


@app.get("/api/reportes/detalle/{formato}")
def exportar_detalle(formato: str, f: dict = Depends(filtros_q), buscar: Optional[str] = None,
                     db: Session = Depends(get_db), u: Usuario = Depends(requiere("exportar"))):
    data = reports.detalle(db, f, buscar, 1, 100000)
    txt = filtros_texto(db, f) + (f" | Búsqueda: {buscar}" if buscar else "")
    if formato == "excel":
        cont, ext = exports.excel_detalle(data["items"], txt, u.username), "xlsx"
    elif formato == "pdf":
        cont, ext = exports.pdf_detalle(data["items"], txt, u.username, data["total_bs"]), "pdf"
    else:
        raise HTTPException(404, "Formato no soportado")
    audit.registrar(db, u.username, "EXPORTACION", {"reporte": "detalle", "formato": formato, "filtros": f,
                                                    "filas": data["total"], "sha256": audit.sha256(cont)})
    db.commit()
    return archivo(cont, "detalle_movimientos", ext)


def _niveles(tipo: str, niveles: Optional[str]) -> list[str]:
    if tipo not in reports.REPORTES:
        raise HTTPException(404, "Reporte no existe")
    base = reports.REPORTES[tipo]["niveles"]
    if niveles:
        pedidos = [n for n in niveles.split(",") if n in reports.DIM and n != "gestion"]
        if pedidos:
            return pedidos
    return base


@app.get("/api/reportes/{tipo}")
def reporte(tipo: str, niveles: Optional[str] = None, f: dict = Depends(filtros_q), db: Session = Depends(get_db),
            u: Usuario = Depends(requiere("reportes"))):
    nv = _niveles(tipo, niveles)
    return {"tipo": tipo, "titulo": reports.REPORTES[tipo]["titulo"], "niveles": nv, "arbol": reports.arbol(db, nv, f)}


def _filas_resumen(db, f):
    filas = []
    for dim, titulo in (("rubro", "POR RUBRO"), ("financiador", "POR FINANCIADOR"), ("region", "POR REGIÓN"),
                        ("area", "POR ÁREA")):
        t = reports.arbol(db, [dim], f)
        filas.append({**t, "label": titulo, "nivel": 0})
        filas += [{**h, "nivel": 1} for h in t["children"]]
    total = reports.arbol(db, ["rubro"], f)
    filas.append({**total, "nivel": -1})
    return filas


@app.get("/api/reportes/{tipo}/{formato}")
def exportar(tipo: str, formato: str, niveles: Optional[str] = None, profundidad: Optional[int] = None,
             f: dict = Depends(filtros_q), db: Session = Depends(get_db), u: Usuario = Depends(requiere("exportar"))):
    if tipo == "consolidado":
        titulo, filas = "RESUMEN GENERAL CONSOLIDADO", _filas_resumen(db, f)
    else:
        nv = _niveles(tipo, niveles)
        titulo = reports.REPORTES[tipo]["titulo"]
        filas = reports.aplanar(reports.arbol(db, nv, f), profundidad)
    txt = filtros_texto(db, f)
    if formato == "excel":
        cont, ext = exports.excel_arbol(titulo, filas, txt, u.username), "xlsx"
    elif formato == "pdf":
        cont, ext = exports.pdf_arbol(titulo, filas, txt, u.username), "pdf"
    else:
        raise HTTPException(404, "Formato no soportado")
    audit.registrar(db, u.username, "EXPORTACION", {"reporte": tipo, "formato": formato, "filtros": f,
                                                    "sha256": audit.sha256(cont)})
    db.commit()
    return archivo(cont, f"reporte_{tipo}", ext)


@app.get("/api/comparativo")
def comparativo(dimension: str = "rubro", gestiones: str = "", f: dict = Depends(filtros_q),
                db: Session = Depends(get_db), u: Usuario = Depends(requiere("reportes"))):
    if dimension not in reports.DIM or dimension == "gestion":
        raise HTTPException(400, "Dimensión inválida")
    g = [int(x) for x in gestiones.split(",") if x.strip()] or \
        [x for (x,) in db.query(Importacion.gestion).filter_by(vigente=True).distinct()]
    f.pop("gestion", None)
    return reports.comparativo(db, dimension, sorted(g), f)


@app.post("/api/importaciones")
async def subir(archivo_xlsx: UploadFile = File(...), gestion: Optional[int] = Form(None),
                db: Session = Depends(get_db), u: Usuario = Depends(requiere("importar"))):
    if not archivo_xlsx.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(400, "Debe subir un archivo Excel")
    contenido = await archivo_xlsx.read()
    try:
        return importar(db, contenido, archivo_xlsx.filename, u, gestion)
    except ErrorImportacion as e:
        db.rollback()
        raise HTTPException(422, str(e))


@app.get("/api/importaciones")
def listar_importaciones(db: Session = Depends(get_db), u: Usuario = Depends(requiere("reportes"))):
    return [{"id": i.id, "gestion": i.gestion, "archivo": i.archivo, "fecha": i.fecha, "vigente": i.vigente,
             "filas_presupuesto": i.filas_presupuesto, "filas_movimientos": i.filas_movimientos,
             "sha256_archivo": i.sha256_archivo, "merkle_root": i.merkle_root}
            for i in db.query(Importacion).order_by(Importacion.id.desc())]


@app.get("/api/tipos-cambio")
def tipos_cambio(gestion: Optional[int] = None, db: Session = Depends(get_db), u: Usuario = Depends(requiere("reportes"))):
    q = db.query(TipoCambio)
    if gestion:
        q = q.filter_by(gestion=gestion)
    return [{"fecha": t.fecha, "tasa": float(t.tasa), "movimientos": t.movimientos}
            for t in q.order_by(TipoCambio.fecha)]


@app.get("/api/auditoria")
def listar_auditoria(limite: int = 200, db: Session = Depends(get_db), u: Usuario = Depends(requiere("auditoria"))):
    return [{"id": a.id, "fecha": a.fecha, "usuario": a.usuario, "accion": a.accion, "detalle": a.detalle,
             "hash_anterior": a.hash_anterior, "hash": a.hash}
            for a in db.query(Auditoria).order_by(Auditoria.id.desc()).limit(limite)]


@app.get("/api/auditoria/verificar")
def verificar(db: Session = Depends(get_db), u: Usuario = Depends(requiere("auditoria"))):
    cadena = audit.verificar_cadena(db)
    datos = [verificar_movimientos(db, g) for (g,) in
             db.query(Importacion.gestion).filter_by(vigente=True).distinct()]
    return {"cadena_auditoria": cadena, "datos_financieros": datos,
            "integro": cadena["integra"] and all(d["integra"] for d in datos)}


@app.post("/api/auditoria/anclajes")
def anclar(db: Session = Depends(get_db), u: Usuario = Depends(requiere("auditoria"))):
    v = audit.verificar_cadena(db)
    if not v["integra"]:
        raise HTTPException(409, "La cadena de auditoría está alterada; no se puede anclar")
    a = audit.crear_anclaje(db, u.username)
    db.commit()
    return {"id": a.id, "hash_raiz": a.hash_raiz, "red": a.red, "estado": a.estado, "comando": a.comprobante}


@app.get("/api/auditoria/anclajes")
def anclajes(db: Session = Depends(get_db), u: Usuario = Depends(requiere("auditoria"))):
    return [{"id": a.id, "fecha": a.fecha, "auditoria_id": a.auditoria_id, "hash_raiz": a.hash_raiz, "red": a.red,
             "estado": a.estado, "comando": a.comprobante} for a in db.query(Anclaje).order_by(Anclaje.id.desc())]


class NuevoUsuario(BaseModel):
    username: str
    nombre: str
    password: str
    rol: str


@app.get("/api/usuarios")
def usuarios(db: Session = Depends(get_db), u: Usuario = Depends(requiere("usuarios"))):
    return [{"id": x.id, "username": x.username, "nombre": x.nombre, "rol": x.rol, "activo": x.activo}
            for x in db.query(Usuario).order_by(Usuario.id)]


@app.post("/api/usuarios")
def crear_usuario(d: NuevoUsuario, db: Session = Depends(get_db), u: Usuario = Depends(requiere("usuarios"))):
    if d.rol not in ROLES:
        raise HTTPException(400, f"Rol inválido. Opciones: {list(ROLES)}")
    if len(d.password) < 8:
        raise HTTPException(400, "La contraseña debe tener al menos 8 caracteres")
    if db.query(Usuario).filter_by(username=d.username).first():
        raise HTTPException(409, "El usuario ya existe")
    nuevo = Usuario(username=d.username, nombre=d.nombre, rol=d.rol, password_hash=hash_password(d.password))
    db.add(nuevo)
    audit.registrar(db, u.username, "USUARIO_CREADO", {"username": d.username, "rol": d.rol})
    db.commit()
    return {"id": nuevo.id, "username": nuevo.username, "rol": nuevo.rol}


@app.patch("/api/usuarios/{uid}")
def cambiar_estado(uid: int, activo: bool, db: Session = Depends(get_db), u: Usuario = Depends(requiere("usuarios"))):
    x = db.get(Usuario, uid)
    if not x:
        raise HTTPException(404, "No existe")
    if x.id == u.id:
        raise HTTPException(400, "No puede desactivarse a sí mismo")
    x.activo = activo
    audit.registrar(db, u.username, "USUARIO_ESTADO", {"username": x.username, "activo": activo})
    db.commit()
    return {"ok": True}
