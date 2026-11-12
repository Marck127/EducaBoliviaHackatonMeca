import io
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

INSTITUCION = "ENSEÑA POR BOLIVIA EXB"
AZUL = "1F3A5F"
COLS = [("Presupuesto inicial", "ppto_inicial"), ("Modificaciones", "modificaciones"),
        ("Presupuesto vigente", "vigente"), ("Ejecución", "ejecucion"), ("Saldo", "saldo"), ("% Ejec.", "pct")]
NIVEL_FILL = ["D6E4F0", "EAF1F8", "F5F8FC", "FFFFFF", "FFFFFF"]


def _subtitulo(filtros_txt: str) -> str:
    return f"(Expresado en bolivianos) — {filtros_txt}" if filtros_txt else "(Expresado en bolivianos)"


def excel_arbol(titulo: str, filas: list[dict], filtros_txt: str, usuario: str) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Reporte"
    ws["A1"] = INSTITUCION
    ws["A2"] = titulo
    ws["A3"] = _subtitulo(filtros_txt)
    ws["A4"] = f"Generado: {datetime.now():%d/%m/%Y %H:%M} por {usuario}"
    for c in ("A1", "A2"):
        ws[c].font = Font(bold=True, size=12, color=AZUL)
    ws["A4"].font = Font(italic=True, size=8, color="666666")
    enc = ["Descripción"] + [c[0] for c in COLS]
    borde = Border(bottom=Side(style="thin", color="BBBBBB"))
    for j, h in enumerate(enc, 1):
        c = ws.cell(row=6, column=j, value=h)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=AZUL)
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for i, f in enumerate(filas, 7):
        total = f["nivel"] == -1
        nivel = max(f["nivel"], 0)
        c = ws.cell(row=i, column=1, value=f["label"])
        c.alignment = Alignment(indent=0 if total else nivel * 2)
        for j, (_, k) in enumerate(COLS, 2):
            v = f.get(k)
            cell = ws.cell(row=i, column=j, value=v)
            cell.number_format = "0.0%" if k == "pct" else "#,##0.00"
        fill = "1F3A5F" if total else NIVEL_FILL[min(nivel, 4)]
        for j in range(1, len(enc) + 1):
            cell = ws.cell(row=i, column=j)
            cell.fill = PatternFill("solid", fgColor=fill)
            cell.border = borde
            cell.font = Font(bold=total or nivel == 0, color="FFFFFF" if total else "000000")
    ws.column_dimensions["A"].width = 52
    for j in range(2, len(enc) + 1):
        ws.column_dimensions[get_column_letter(j)].width = 18
    ws.freeze_panes = "B7"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _num(v, pct=False):
    if v is None:
        return "—"
    return f"{v * 100:,.1f}%" if pct else f"{v:,.2f}"


def _doc(buf, titulo, filtros_txt, usuario):
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=1.2 * cm, rightMargin=1.2 * cm,
                            topMargin=1.2 * cm, bottomMargin=1.2 * cm, title=titulo)
    st = getSampleStyleSheet()
    cab = [Paragraph(f"<b>{INSTITUCION}</b>", st["Title"]), Paragraph(f"<b>{titulo}</b>", st["Heading3"]),
           Paragraph(_subtitulo(filtros_txt), st["Normal"]),
           Paragraph(f"<font size=7 color='#666666'>Generado: {datetime.now():%d/%m/%Y %H:%M} por {usuario}</font>",
                     st["Normal"]), Spacer(1, 8)]
    return doc, cab


def pdf_arbol(titulo: str, filas: list[dict], filtros_txt: str, usuario: str) -> bytes:
    buf = io.BytesIO()
    doc, story = _doc(buf, titulo, filtros_txt, usuario)
    data = [["Descripción"] + [c[0] for c in COLS]]
    estilos = [("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#" + AZUL)),
               ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
               ("FONTSIZE", (0, 0), (-1, -1), 7.5), ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
               ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#BBBBBB")),
               ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]
    for i, f in enumerate(filas, 1):
        nivel = max(f["nivel"], 0)
        total = f["nivel"] == -1
        data.append([("" if total else "   " * nivel) + str(f["label"])[:70]] +
                    [_num(f.get(k), k == "pct") for _, k in COLS])
        if total:
            estilos += [("BACKGROUND", (0, i), (-1, i), colors.HexColor("#" + AZUL)),
                        ("TEXTCOLOR", (0, i), (-1, i), colors.white), ("FONTNAME", (0, i), (-1, i), "Helvetica-Bold")]
        elif nivel == 0:
            estilos += [("BACKGROUND", (0, i), (-1, i), colors.HexColor("#D6E4F0")),
                        ("FONTNAME", (0, i), (-1, i), "Helvetica-Bold")]
    t = Table(data, colWidths=[9.5 * cm] + [2.9 * cm] * len(COLS), repeatRows=1)
    t.setStyle(TableStyle(estilos))
    story.append(t)
    doc.build(story)
    return buf.getvalue()


DET_COLS = [("Fecha", "fecha"), ("Mes", "mes"), ("Comp.", "tipo_comprobante"), ("N°", "numero"),
            ("Región", "region"), ("Financiador", "financiador"), ("Rubro", "rubro"), ("Cuenta", "cuenta"),
            ("Área", "area"), ("Referencia", "referencia"), ("Debe Bs", "debe_bs"), ("Haber Bs", "haber_bs"),
            ("Debe USD", "debe_usd"), ("Tasa", "tasa")]


def excel_detalle(items: list[dict], filtros_txt: str, usuario: str) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Movimientos"
    ws["A1"] = INSTITUCION
    ws["A2"] = "DETALLE DE MOVIMIENTOS"
    ws["A3"] = _subtitulo(filtros_txt)
    ws["A4"] = f"Generado: {datetime.now():%d/%m/%Y %H:%M} por {usuario}"
    for c in ("A1", "A2"):
        ws[c].font = Font(bold=True, size=12, color=AZUL)
    for j, (h, _) in enumerate(DET_COLS, 1):
        c = ws.cell(row=6, column=j, value=h)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=AZUL)
    for i, it in enumerate(items, 7):
        for j, (_, k) in enumerate(DET_COLS, 1):
            c = ws.cell(row=i, column=j, value=it.get(k))
            if k in ("debe_bs", "haber_bs", "debe_usd"):
                c.number_format = "#,##0.00"
            elif k == "fecha":
                c.number_format = "DD/MM/YYYY"
    fin = len(items) + 7
    ws.cell(row=fin, column=10, value="TOTAL").font = Font(bold=True)
    for col in (11, 12, 13):
        L = get_column_letter(col)
        c = ws.cell(row=fin, column=col, value=f"=SUM({L}7:{L}{fin - 1})")
        c.font = Font(bold=True)
        c.number_format = "#,##0.00"
    anchos = [11, 11, 7, 6, 7, 16, 22, 24, 30, 60, 13, 12, 12, 7]
    for j, w in enumerate(anchos, 1):
        ws.column_dimensions[get_column_letter(j)].width = w
    ws.freeze_panes = "A7"
    ws.auto_filter.ref = f"A6:{get_column_letter(len(DET_COLS))}{fin - 1}"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def pdf_detalle(items: list[dict], filtros_txt: str, usuario: str, total_bs: float) -> bytes:
    buf = io.BytesIO()
    doc, story = _doc(buf, "DETALLE DE MOVIMIENTOS", filtros_txt, usuario)
    st = getSampleStyleSheet()["Normal"]
    st.fontSize = 6.5
    st.leading = 7.5
    cols = [("Fecha", "fecha"), ("Fin.", "financiador"), ("Rubro / Cuenta", "cuenta"), ("Área", "area"),
            ("Referencia", "referencia"), ("Debe Bs", "debe_bs"), ("Debe USD", "debe_usd")]
    data = [[c[0] for c in cols]]
    for it in items:
        data.append([it["fecha"].strftime("%d/%m/%Y") if it.get("fecha") else "", it["financiador"],
                     Paragraph(f"{it['rubro']}<br/>{it['cuenta']}", st), Paragraph(it["area"], st),
                     Paragraph((it.get("referencia") or "")[:160], st), _num(it["debe_bs"]), _num(it["debe_usd"])])
    data.append(["", "", "", "", "TOTAL", _num(total_bs), ""])
    t = Table(data, colWidths=[1.8 * cm, 2.3 * cm, 4.2 * cm, 3.6 * cm, 10.5 * cm, 2.2 * cm, 2.0 * cm], repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#" + AZUL)),
                           ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("FONTSIZE", (0, 0), (-1, -1), 6.5),
                           ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("ALIGN", (5, 0), (-1, -1), "RIGHT"),
                           ("VALIGN", (0, 0), (-1, -1), "TOP"), ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                           ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#BBBBBB"))]))
    story.append(t)
    doc.build(story)
    return buf.getvalue()
