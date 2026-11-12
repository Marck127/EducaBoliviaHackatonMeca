import io
import json
from datetime import datetime, date
import pandas as pd
from sqlalchemy import delete, update
from sqlalchemy.orm import Session
from .models import (Financiador, Region, Area, Rubro, Cuenta, Presupuesto, Modificacion, Movimiento,
                     TipoCambio, Importacion)
from .audit import sha256, merkle_root, registrar

MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE",
         "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
MES_NUM = {m: i + 1 for i, m in enumerate(MESES)} | {"SETIEMBRE": 9}

COLUMNAS = {
    "mes": "mes", "codigo": "codigo", "nombre": "nombre", "cfecha": "cfecha", "tipo": "tipo",
    "numero": "numero", "no_cheque": "no_cheque", "region": "region", "ref": "ref",
    "ejecución": "debe", "ejecucion": "debe", "debe": "debe", "haber": "haber", "dsus": "dsus",
    "hsus": "hsus", "tasa": "tasa", "fondo": "fondo", "rubro": "rubro", "cuenta": "cuenta",
    "area": "area", "presupuesto bs": "presupuesto_bs",
}
REQUERIDAS = {"mes", "region", "ref", "debe", "fondo", "rubro", "cuenta", "area", "presupuesto_bs"}


class ErrorImportacion(Exception):
    pass


def _leer_hoja(contenido: bytes) -> pd.DataFrame:
    xls = pd.ExcelFile(io.BytesIO(contenido))
    hojas = ["BD"] + [h for h in xls.sheet_names if h != "BD"] if "BD" in xls.sheet_names else xls.sheet_names
    for hoja in hojas:
        crudo = pd.read_excel(xls, sheet_name=hoja, header=None, nrows=10)
        for i, fila in crudo.iterrows():
            nombres = {str(v).strip().lower() for v in fila if pd.notna(v)}
            if {"mes", "fondo", "rubro"} <= nombres:
                df = pd.read_excel(xls, sheet_name=hoja, header=i)
                df.columns = [COLUMNAS.get(str(c).strip().lower(), str(c).strip().lower()) for c in df.columns]
                faltan = REQUERIDAS - set(df.columns)
                if faltan:
                    raise ErrorImportacion(f"Faltan columnas en la hoja {hoja}: {sorted(faltan)}")
                df["fila_origen"] = df.index + i + 2
                return df.dropna(how="all", subset=["mes", "fondo", "rubro"])
    raise ErrorImportacion("No se encontró una hoja con la estructura de la base de datos (mes, fondo, rubro...)")


def _txt(v):
    if v is None or (isinstance(v, float) and pd.isna(v)) or v is pd.NaT:
        return None
    s = str(v).strip()
    return s or None


def _codigo(v):
    if isinstance(v, float) and not pd.isna(v) and v.is_integer():
        return str(int(v))
    return _txt(v)


def _num(v) -> float:
    try:
        f = float(v)
        return 0.0 if pd.isna(f) else round(f, 2)
    except (TypeError, ValueError):
        return 0.0


def _int(v):
    try:
        f = float(v)
        return None if pd.isna(f) else int(f)
    except (TypeError, ValueError):
        return None


def _fecha(v) -> date | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, (datetime, pd.Timestamp)):
        return v.date()
    try:
        return datetime.strptime(str(v).strip()[:10], "%d/%m/%Y").date()
    except ValueError:
        return None


class Catalogos:
    def __init__(self, db: Session):
        self.db = db
        self.cache = {}

    def _get(self, modelo, nombre, **extra):
        clave = (modelo.__name__, nombre, tuple(extra.items()))
        if clave not in self.cache:
            obj = self.db.query(modelo).filter_by(nombre=nombre, **extra).first()
            if not obj:
                obj = modelo(nombre=nombre, **extra)
                self.db.add(obj)
                self.db.flush()
            self.cache[clave] = obj.id
        return self.cache[clave]

    def ids(self, fila) -> dict:
        rubro = _txt(fila["rubro"]) or "SIN RUBRO"
        rubro_id = self._get(Rubro, rubro)
        return {
            "financiador_id": self._get(Financiador, _txt(fila["fondo"]) or "SIN FINANCIADOR"),
            "region_id": self._get(Region, _txt(fila["region"]) or "SIN REGION"),
            "area_id": self._get(Area, _txt(fila["area"]) or "SIN AREA"),
            "cuenta_id": self._get(Cuenta, _txt(fila["cuenta"]) or rubro, rubro_id=rubro_id),
        }


def importar(db: Session, contenido: bytes, archivo: str, usuario, gestion: int | None = None) -> dict:
    df = _leer_hoja(contenido)
    df["mes"] = df["mes"].astype(str).str.strip().str.upper()
    if gestion is None:
        anios = [f.year for f in map(_fecha, df.get("cfecha", pd.Series(dtype=object))) if f]
        if not anios:
            raise ErrorImportacion("No se pudo deducir la gestión; indíquela manualmente")
        gestion = max(set(anios), key=anios.count)

    desconocidos = sorted(set(df["mes"]) - set(MES_NUM) - {"PTTO"})
    if desconocidos:
        raise ErrorImportacion(f"Valores de mes no reconocidos: {desconocidos}")

    for modelo in (Modificacion, Presupuesto, Movimiento, TipoCambio):
        db.execute(delete(modelo).where(modelo.gestion == gestion))
    db.execute(update(Importacion).where(Importacion.gestion == gestion).values(vigente=False))

    imp = Importacion(gestion=gestion, archivo=archivo, sha256_archivo=sha256(contenido), merkle_root="",
                      filas_presupuesto=0, filas_movimientos=0, usuario_id=usuario.id if usuario else None)
    db.add(imp)
    db.flush()

    cat = Catalogos(db)
    hashes, tasas = [], {}
    n_ppto = n_mod = n_mov = 0
    resumen = {"presupuesto_inicial": 0.0, "ajustes_mensuales": 0.0, "asociado_a_movimientos": 0.0, "ejecucion": 0.0}

    for _, f in df.iterrows():
        ids = cat.ids(f)
        fila = int(f["fila_origen"])
        ppto = _num(f["presupuesto_bs"])
        debe = _num(f["debe"])
        haber = _num(f.get("haber"))
        es_mov = f["mes"] != "PTTO" and (debe or haber or _int(f.get("tipo")) is not None)

        if f["mes"] == "PTTO":
            db.add(Presupuesto(gestion=gestion, monto_bs=ppto, importacion_id=imp.id, fila_origen=fila, **ids))
            n_ppto += 1
            resumen["presupuesto_inicial"] += ppto
            continue

        mes = MES_NUM[f["mes"]]
        mov_id = None
        if es_mov:
            fecha = _fecha(f.get("cfecha"))
            tasa = _num(f.get("tasa")) or None
            datos = {
                "gestion": gestion, "mes": mes, "fecha": fecha, "codigo_contable": _codigo(f.get("codigo")),
                "nombre_contable": _txt(f.get("nombre")), "tipo_comprobante": _int(f.get("tipo")),
                "numero": _int(f.get("numero")), "no_cheque": _codigo(f.get("no_cheque")),
                "referencia": _txt(f.get("ref")), "debe_bs": debe, "haber_bs": haber,
                "debe_usd": _num(f.get("dsus")), "haber_usd": _num(f.get("hsus")), "tasa": tasa, **ids,
            }
            h = sha256(json.dumps(datos, sort_keys=True, default=str))
            mov = Movimiento(**datos, hash_fila=h, importacion_id=imp.id, fila_origen=fila)
            db.add(mov)
            db.flush()
            mov_id = mov.id
            hashes.append(h)
            n_mov += 1
            resumen["ejecucion"] += debe - haber
            if tasa:
                k = (fecha, tasa)
                tasas[k] = tasas.get(k, 0) + 1

        if ppto:
            origen = "ASOCIADA_A_MOVIMIENTO" if mov_id else "AJUSTE_MENSUAL"
            db.add(Modificacion(gestion=gestion, mes=mes, origen=origen, monto_bs=ppto, movimiento_id=mov_id,
                                importacion_id=imp.id, fila_origen=fila, **ids))
            n_mod += 1
            resumen["asociado_a_movimientos" if mov_id else "ajustes_mensuales"] += ppto

    for (fecha, tasa), n in tasas.items():
        db.add(TipoCambio(gestion=gestion, fecha=fecha, tasa=tasa, movimientos=n))

    imp.merkle_root = merkle_root(hashes)
    imp.filas_presupuesto = n_ppto + n_mod
    imp.filas_movimientos = n_mov
    resumen = {k: round(v, 2) for k, v in resumen.items()}
    resumen["presupuesto_vigente"] = round(
        resumen["presupuesto_inicial"] + resumen["ajustes_mensuales"] + resumen["asociado_a_movimientos"], 2)
    out = {"importacion_id": imp.id, "gestion": gestion, "archivo": archivo, "filas_presupuesto_inicial": n_ppto,
           "filas_modificaciones": n_mod, "filas_movimientos": n_mov, "sha256_archivo": imp.sha256_archivo,
           "merkle_root": imp.merkle_root, "totales": resumen}
    registrar(db, usuario.username if usuario else "sistema", "IMPORTACION", out)
    db.commit()
    return out


def verificar_movimientos(db: Session, gestion: int) -> dict:
    imp = db.query(Importacion).filter_by(gestion=gestion, vigente=True).order_by(Importacion.id.desc()).first()
    if not imp:
        return {"gestion": gestion, "integra": False, "motivo": "Sin importación vigente"}
    alterados, hashes = [], []
    campos = ["gestion", "mes", "fecha", "codigo_contable", "nombre_contable", "tipo_comprobante", "numero",
              "no_cheque", "referencia", "debe_bs", "haber_bs", "debe_usd", "haber_usd", "tasa",
              "financiador_id", "region_id", "area_id", "cuenta_id"]
    for m in db.query(Movimiento).filter_by(importacion_id=imp.id).order_by(Movimiento.id):
        datos = {}
        for c in campos:
            v = getattr(m, c)
            if c in ("debe_bs", "haber_bs", "debe_usd", "haber_usd"):
                v = round(float(v or 0), 2)
            elif c == "tasa" and v is not None:
                v = round(float(v), 2)
            datos[c] = v
        h = sha256(json.dumps(datos, sort_keys=True, default=str))
        hashes.append(h)
        if h != m.hash_fila:
            alterados.append({"id": m.id, "fila_excel": m.fila_origen})
    raiz = merkle_root(hashes)
    return {"gestion": gestion, "importacion_id": imp.id, "movimientos": len(hashes),
            "merkle_root_registrado": imp.merkle_root, "merkle_root_actual": raiz,
            "integra": raiz == imp.merkle_root and not alterados, "alterados": alterados[:50]}
