import sys, json, urllib.request, urllib.parse
import openpyxl
XL = sys.argv[1]
API = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8000'
body = urllib.parse.urlencode({'username': 'admin', 'password': 'admin123'}).encode()
T = json.load(urllib.request.urlopen(API + '/api/auth/login', body))['access_token']
def get(u):
    r = urllib.request.Request(API + u, headers={'Authorization': 'Bearer ' + T})
    return json.load(urllib.request.urlopen(r))
wb = openpyxl.load_workbook(XL, data_only=False)
casos = {'Rubro': ('rubro', 'rubro'), 'por cuenta': ('rubro', None), 'Financiador': ('financiador', 'financiador,rubro'),
         'Por Area y Fin': ('area', 'area,financiador,rubro'), 'Por region y Area': ('region', None), 'Por mes': ('mes', 'mes')}
for hoja, (tipo, niv) in casos.items():
    ws = wb[hoja]
    filas = []
    ini = False
    for row in ws.iter_rows(values_only=True):
        vals = [v for v in row]
        while vals and vals[0] is None: vals = vals[1:]
        if not vals: continue
        if vals[0] == 'Etiquetas de fila': ini = True; continue
        vals += [None]*3
        if ini and vals[0] is not None and isinstance(vals[1], (int, float, type(None))):
            filas.append((str(vals[0]).strip().replace('PTTO', 'PRESUPUESTO INICIAL'), vals[1] or 0, vals[2] or 0))
    d = get(f'/api/reportes/{tipo}' + (f'?niveles={niv}' if niv else ''))
    plano = []
    def rec(n):
        for h in n['children']:
            plano.append((h['label'], h['vigente'], h['ejecucion'])); rec(h)
    rec(d['arbol']); plano.append(('Total general', d['arbol']['vigente'], d['arbol']['ejecucion']))
    xs = {}
    for l, b, e in filas: xs.setdefault(l, []).append((round(b, 2), round(e, 2)))
    ok = 0; mal = []
    for l, b, e in plano:
        lst = xs.get(l, [])
        if (round(b, 2), round(e, 2)) in lst:
            ok += 1; lst.remove((round(b, 2), round(e, 2)))
        else: mal.append((l, b, e))
    print(f'{hoja:20s} filas Excel={len(filas):4d}  coinciden={ok:4d}  difieren={len(mal)}', mal[:4])
