import hashlib
import json
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session
from .models import Auditoria, Anclaje

GENESIS = "0" * 64


def sha256(s: str | bytes) -> str:
    return hashlib.sha256(s.encode() if isinstance(s, str) else s).hexdigest()


def _contenido(fecha: datetime, usuario: str | None, accion: str, detalle: dict, hash_anterior: str) -> str:
    return json.dumps(
        {"fecha": fecha.isoformat(timespec="microseconds"), "usuario": usuario, "accion": accion,
         "detalle": detalle, "hash_anterior": hash_anterior},
        sort_keys=True, ensure_ascii=False, default=str,
    )


def registrar(db: Session, usuario: str | None, accion: str, detalle: dict | None = None) -> Auditoria:
    db.execute(text("SELECT pg_advisory_xact_lock(424242)"))
    ultimo = db.query(Auditoria).order_by(Auditoria.id.desc()).first()
    previo = ultimo.hash if ultimo else GENESIS
    fecha = datetime.utcnow()
    detalle = json.loads(json.dumps(detalle or {}, default=str))
    reg = Auditoria(fecha=fecha, usuario=usuario, accion=accion, detalle=detalle, hash_anterior=previo,
                    hash=sha256(_contenido(fecha, usuario, accion, detalle, previo)))
    db.add(reg)
    db.flush()
    return reg


def verificar_cadena(db: Session) -> dict:
    previo = GENESIS
    total = 0
    for r in db.query(Auditoria).order_by(Auditoria.id).yield_per(500):
        total += 1
        esperado = sha256(_contenido(r.fecha, r.usuario, r.accion, r.detalle, r.hash_anterior))
        if r.hash_anterior != previo or r.hash != esperado:
            return {"integra": False, "registros": total, "falla_en_id": r.id,
                    "motivo": "enlace roto" if r.hash_anterior != previo else "contenido alterado"}
        previo = r.hash
    return {"integra": True, "registros": total, "hash_raiz": previo}


def merkle_root(hojas: list[str]) -> str:
    if not hojas:
        return GENESIS
    nivel = hojas[:]
    while len(nivel) > 1:
        if len(nivel) % 2:
            nivel.append(nivel[-1])
        nivel = [sha256(nivel[i] + nivel[i + 1]) for i in range(0, len(nivel), 2)]
    return nivel[0]


def crear_anclaje(db: Session, usuario: str) -> Anclaje:
    ultimo = db.query(Auditoria).order_by(Auditoria.id.desc()).first()
    if not ultimo:
        raise ValueError("No hay registros de auditoría")
    anc = Anclaje(auditoria_id=ultimo.id, hash_raiz=ultimo.hash, red="OpenTimestamps (Bitcoin)", estado="PENDIENTE",
                  comprobante=f"echo -n {ultimo.hash} > raiz_{ultimo.id}.txt && ots stamp raiz_{ultimo.id}.txt")
    db.add(anc)
    db.flush()
    registrar(db, usuario, "ANCLAJE_GENERADO", {"anclaje_id": anc.id, "hash_raiz": anc.hash_raiz})
    return anc
