from sqlalchemy import text
from sqlalchemy.orm import Session
from .importer import MESES

VISTA = """
CREATE OR REPLACE VIEW v_hechos AS
SELECT p.gestion, 0 AS mes, p.financiador_id, p.region_id, p.area_id, p.cuenta_id,
       p.monto_bs AS ppto_inicial, 0::numeric AS modificaciones, 0::numeric AS ejecucion, 0::numeric AS ejecucion_usd,
       0::numeric AS sin_ppto_previo
FROM presupuestos p
UNION ALL
SELECT m.gestion, m.mes, m.financiador_id, m.region_id, m.area_id, m.cuenta_id,
       0, m.monto_bs, 0, 0, CASE WHEN m.origen = 'ASOCIADA_A_MOVIMIENTO' THEN m.monto_bs ELSE 0 END
FROM modificaciones m
UNION ALL
SELECT v.gestion, v.mes, v.financiador_id, v.region_id, v.area_id, v.cuenta_id,
       0, 0, v.debe_bs - v.haber_bs, v.debe_usd - v.haber_usd, 0
FROM movimientos v;
"""

DIM = {
    "gestion": ("h.gestion::text", "h.gestion"),
    "financiador": ("f.nombre", "f.id"),
    "region": ("r.nombre", "r.id"),
    "area": ("a.nombre", "a.id"),
    "rubro": ("ru.nombre", "ru.id"),
    "cuenta": ("c.nombre", "c.id"),
    "mes": ("h.mes::text", "h.mes"),
}
JOINS = """
FROM v_hechos h
JOIN financiadores f ON f.id = h.financiador_id
JOIN regiones r ON r.id = h.region_id
JOIN areas a ON a.id = h.area_id
JOIN cuentas c ON c.id = h.cuenta_id
JOIN rubros ru ON ru.id = c.rubro_id
"""

REPORTES = {
    "rubro": {"titulo": "EJECUCIÓN PRESUPUESTARIA POR RUBRO Y CUENTA", "niveles": ["rubro", "cuenta"]},
    "financiador": {"titulo": "EJECUCIÓN PRESUPUESTARIA POR FUENTE DE FINANCIAMIENTO",
                    "niveles": ["financiador", "rubro", "cuenta"]},
    "area": {"titulo": "EJECUCIÓN PRESUPUESTARIA POR ÁREA Y FINANCIADOR",
             "niveles": ["area", "financiador", "rubro", "cuenta"]},
    "region": {"titulo": "EJECUCIÓN PRESUPUESTARIA POR REGIÓN",
               "niveles": ["region", "area", "financiador", "rubro", "cuenta"]},
    "mes": {"titulo": "EJECUCIÓN PRESUPUESTARIA POR MES", "niveles": ["mes", "rubro", "cuenta"]},
}

FILTROS = ["gestion", "financiador", "region", "area", "rubro", "cuenta", "mes"]
METRICAS = ["ppto_inicial", "modificaciones", "vigente", "ejecucion", "ejecucion_usd", "saldo", "pct", "sin_ppto_previo"]


def crear_vista(db: Session):
    db.execute(text(VISTA))
    db.commit()


def etiqueta_mes(m) -> str:
    m = int(m)
    return "PRESUPUESTO INICIAL" if m == 0 else MESES[m - 1]


def _where(filtros: dict) -> tuple[str, dict]:
    partes, params = [], {}
    for k in FILTROS:
        vals = filtros.get(k)
        if not vals:
            continue
        col = DIM[k][1]
        nombres = [f"{k}_{i}" for i in range(len(vals))]
        partes.append(f"{col} IN ({', '.join(':' + n for n in nombres)})")
        for n, v in zip(nombres, vals):
            params[n] = int(v)
    return (" WHERE " + " AND ".join(partes)) if partes else "", params


def _metricas(d: dict) -> dict:
    vig = d["ppto_inicial"] + d["modificaciones"]
    d["vigente"] = round(vig, 2)
    d["saldo"] = round(vig - d["ejecucion"], 2)
    d["pct"] = round(d["ejecucion"] / vig, 4) if vig else None
    for k in ("ppto_inicial", "modificaciones", "ejecucion", "ejecucion_usd", "sin_ppto_previo"):
        d[k] = round(d[k], 2)
    return d


def _vacio() -> dict:
    return {k: 0.0 for k in ("ppto_inicial", "modificaciones", "ejecucion", "ejecucion_usd", "sin_ppto_previo")}


def consultar(db: Session, niveles: list[str], filtros: dict) -> list[dict]:
    sel = ", ".join(f"{DIM[n][0]} AS {n}_label, {DIM[n][1]} AS {n}_id" for n in niveles)
    grp = ", ".join(f"{DIM[n][0]}, {DIM[n][1]}" for n in niveles)
    where, params = _where(filtros)
    sql = f"""
        SELECT {sel},
               SUM(h.ppto_inicial) ppto_inicial, SUM(h.modificaciones) modificaciones,
               SUM(h.ejecucion) ejecucion, SUM(h.ejecucion_usd) ejecucion_usd, SUM(h.sin_ppto_previo) sin_ppto_previo
        {JOINS} {where}
        GROUP BY {grp}
        ORDER BY {', '.join(DIM[n][1] if n in ('mes', 'gestion') else DIM[n][0] for n in niveles)}
    """
    return [dict(r._mapping) for r in db.execute(text(sql), params)]


def arbol(db: Session, niveles: list[str], filtros: dict) -> dict:
    filas = consultar(db, niveles, filtros)
    raiz = {"label": "Total general", "nivel": -1, "children": {}, **_vacio()}
    for f in filas:
        nodo = raiz
        for k in _vacio():
            raiz[k] += float(f[k] or 0)
        for i, n in enumerate(niveles):
            fid = f[f"{n}_id"]
            label = etiqueta_mes(fid) if n == "mes" else f[f"{n}_label"]
            hijos = nodo["children"]
            if fid not in hijos:
                hijos[fid] = {"id": fid, "dimension": n, "label": label, "nivel": i, "children": {}, **_vacio()}
            nodo = hijos[fid]
            for k in _vacio():
                nodo[k] += float(f[k] or 0)

    def cerrar(n, ruta=""):
        n["key"] = ruta or "total"
        hijos = list(n["children"].values())
        n["children"] = [cerrar(h, f"{ruta}/{h['dimension']}:{h['id']}") for h in hijos]
        return _metricas(n)

    return cerrar(raiz)


def aplanar(nodo: dict, profundidad: int | None = None) -> list[dict]:
    out = []

    def rec(n):
        for h in n["children"]:
            out.append(h)
            if profundidad is None or h["nivel"] + 1 < profundidad:
                rec(h)
    rec(nodo)
    out.append(nodo)
    return out


def detalle(db: Session, filtros: dict, buscar: str | None, pagina: int, por_pagina: int) -> dict:
    where, params = _where({k: v for k, v in filtros.items()})
    where = where.replace("h.gestion", "v.gestion").replace("h.mes", "v.mes")
    cond = [where[7:]] if where else []
    if buscar:
        cond.append("(v.referencia ILIKE :q OR v.nombre_contable ILIKE :q OR v.codigo_contable ILIKE :q)")
        params["q"] = f"%{buscar}%"
    w = (" WHERE " + " AND ".join(cond)) if cond else ""
    base = f"""
        FROM movimientos v
        JOIN financiadores f ON f.id = v.financiador_id
        JOIN regiones r ON r.id = v.region_id
        JOIN areas a ON a.id = v.area_id
        JOIN cuentas c ON c.id = v.cuenta_id
        JOIN rubros ru ON ru.id = c.rubro_id {w}
    """
    tot = db.execute(text(f"SELECT COUNT(*) n, COALESCE(SUM(v.debe_bs - v.haber_bs),0) bs, "
                          f"COALESCE(SUM(v.debe_usd - v.haber_usd),0) usd {base}"), params).one()
    params.update(lim=por_pagina, off=(pagina - 1) * por_pagina)
    filas = db.execute(text(f"""
        SELECT v.id, v.gestion, v.mes, v.fecha, v.codigo_contable, v.nombre_contable, v.tipo_comprobante,
               v.numero, v.no_cheque, r.nombre region, v.referencia, v.debe_bs, v.haber_bs, v.debe_usd,
               v.haber_usd, v.tasa, f.nombre financiador, ru.nombre rubro, c.nombre cuenta, a.nombre area
        {base} ORDER BY v.fecha DESC NULLS LAST, v.id DESC LIMIT :lim OFFSET :off"""), params)
    items = []
    for r in filas:
        d = dict(r._mapping)
        d["mes"] = etiqueta_mes(d["mes"])
        for k in ("debe_bs", "haber_bs", "debe_usd", "haber_usd", "tasa"):
            d[k] = float(d[k]) if d[k] is not None else None
        items.append(d)
    return {"total": tot.n, "total_bs": round(float(tot.bs), 2), "total_usd": round(float(tot.usd), 2),
            "pagina": pagina, "por_pagina": por_pagina, "items": items}


def resumen(db: Session, filtros: dict) -> dict:
    total = arbol(db, ["rubro"], filtros)
    out = {"totales": {k: total[k] for k in METRICAS}}
    for dim in ("rubro", "financiador", "region", "area"):
        t = arbol(db, [dim], filtros)
        out[dim] = [{"id": h["id"], "label": h["label"], **{k: h[k] for k in METRICAS}} for h in t["children"]]
    t = arbol(db, ["mes"], filtros)
    out["mes"] = [{"id": h["id"], "label": h["label"], **{k: h[k] for k in METRICAS}} for h in t["children"] if h["id"] != 0]
    acumulado = 0.0
    for m in out["mes"]:
        acumulado += m["ejecucion"]
        m["ejecucion_acumulada"] = round(acumulado, 2)
    cuentas = arbol(db, ["rubro", "cuenta"], filtros)
    alertas = []
    for r in cuentas["children"]:
        for c in r["children"]:
            plan = round(c["ppto_inicial"] + c["modificaciones"] - c["sin_ppto_previo"], 2)
            if c["ejecucion"] > plan + 0.005:
                alertas.append({"tipo": "SIN_PRESUPUESTO" if plan <= 0 else "SOBREEJECUCION",
                                "rubro": r["label"], "cuenta": c["label"], "planificado": plan,
                                "ejecucion": c["ejecucion"], "exceso": round(c["ejecucion"] - plan, 2)})
    alertas.sort(key=lambda a: -a["exceso"])
    out["alertas"] = alertas
    out["control"] = {
        "presupuesto_asignado_despues_de_ejecutar": total["sin_ppto_previo"],
        "pct_del_vigente": round(total["sin_ppto_previo"] / total["vigente"], 4) if total["vigente"] else None,
    }
    return out


def comparativo(db: Session, dimension: str, gestiones: list[int], filtros: dict) -> dict:
    f = dict(filtros)
    f["gestion"] = gestiones
    filas = consultar(db, [dimension, "gestion"], f)
    datos = {}
    for r in filas:
        fid = r[f"{dimension}_id"]
        label = etiqueta_mes(fid) if dimension == "mes" else r[f"{dimension}_label"]
        d = datos.setdefault(fid, {"id": fid, "label": label, "gestiones": {}})
        m = _metricas({k: float(r[k] or 0) for k in _vacio()})
        d["gestiones"][str(r["gestion_id"])] = {k: m[k] for k in ("vigente", "ejecucion", "saldo", "pct")}
    return {"dimension": dimension, "gestiones": gestiones, "filas": list(datos.values())}
