# SICOP — Sistema Web de Control Presupuestario y Ejecución Financiera

Aplicativo web que importa la base de datos del sistema contable (Excel, hoja `BD`), la guarda normalizada en PostgreSQL y genera automáticamente los 7 reportes de ejecución presupuestaria, con filtros combinados, niveles desplegables, exportación a Excel/PDF, dashboard, comparativo por gestión, usuarios con roles y auditoría con cadena de hashes anclable en blockchain.

## Arquitectura

| Componente | Tecnología |
|---|---|
| Interfaz web | React 18 + Vite, Recharts |
| API y cálculos | Python 3.12 + FastAPI + SQLAlchemy |
| Base de datos | PostgreSQL 16 |
| Importación | pandas + openpyxl en el servidor |
| Reportes | openpyxl (Excel) y ReportLab (PDF) |
| Seguridad | JWT, contraseñas PBKDF2-SHA256, roles y permisos, auditoría encadenada SHA-256 |
| Integridad | Hash por movimiento + raíz Merkle por importación; anclaje OpenTimestamps (Bitcoin) |
| Despliegue | Docker Compose (db, api, web, backup diario con `pg_dump`) |

### Modelo de datos

`usuarios`, `financiadores`, `regiones`, `areas`, `rubros`, `cuentas`, `presupuestos` (inicial), `modificaciones`, `movimientos`, `tipos_cambio`, `importaciones`, `auditoria`, `anclajes`. La vista `v_hechos` une presupuesto, modificaciones y ejecución para todas las consultas.

### Tratamiento del presupuesto (decisión de diseño)

La hoja BD contiene tres tipos de filas con presupuesto:

| Filas | Bs | Interpretación en el sistema |
|---|---|---|
| `mes = PTTO` | 2.532.269,47 | Presupuesto inicial |
| Mes con `ref = PRESUPUESTO`, sin comprobante | 102.415,38 | Modificación (ajuste mensual) |
| Movimiento con `presupuesto Bs` = ejecución | 528.694,16 | Modificación asociada al movimiento |

Presupuesto vigente = inicial + modificaciones = **3.163.379,01**, que coincide exactamente con las tablas dinámicas. El sistema muestra además el indicador de control interno **"presupuesto asignado después de ejecutar"** y alertas por cuenta comparando la ejecución contra lo planificado (inicial + ajustes).

### Validación contra el Excel original

```
Rubro                filas Excel=   8  coinciden=   7  difieren=0
por cuenta           filas Excel=  37  coinciden=  37  difieren=0
Financiador          filas Excel=  22  coinciden=  22  difieren=0
Por Area y Fin       filas Excel= 125  coinciden= 125  difieren=0
Por region y Area    filas Excel= 317  coinciden= 317  difieren=0
Por mes              filas Excel=  11  coinciden=  11  difieren=0
```

(La fila restante de "Rubro" es la fila vacía de la tabla dinámica.) Se reproduce con `python scripts/validar_contra_excel.py data/Prueba_ExB_Nov_2026.xlsx`.

## Ejecución con Docker (recomendado)

```bash
docker compose up --build -d
```

- Aplicación: http://localhost:8080
- API y documentación interactiva: http://localhost:8000/docs
- La primera vez importa automáticamente `data/Prueba_ExB_Nov_2026.xlsx`.
- Copias de seguridad diarias en `./backups`.

Para producción, defina en un archivo `.env`: `DB_PASSWORD`, `SECRET_KEY` (32+ caracteres), `ADMIN_PASSWORD`, `TECNICO_PASSWORD`, `CONSULTA_PASSWORD`.

## Ejecución sin Docker

Requiere PostgreSQL 16, Python 3.11+ y Node 20+.

```bash
createdb presupuesto
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql+psycopg2://postgres:postgres@localhost:5432/presupuesto"
export SEED_FILE="../data/Prueba_ExB_Nov_2026.xlsx"
uvicorn app.main:app --port 8000
```

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Aplicación en http://localhost:5173

## Usuarios iniciales

| Usuario | Contraseña | Rol | Permisos |
|---|---|---|---|
| admin | admin123 | admin | todo |
| tecnico | tecnico123 | tecnico | reportes, exportar, importar |
| consulta | consulta123 | consulta | ver reportes |

## Reportes

1. Ejecución por rubro y cuenta
2. Ejecución por financiador (financiador → rubro → cuenta)
3. Ejecución por área y financiador (área → financiador → rubro → cuenta)
4. Ejecución por región (región → área → financiador → rubro → cuenta)
5. Ejecución por mes (mes → rubro → cuenta)
6. Detalle de movimientos (búsqueda de texto y paginación)
7. Resumen general consolidado

Todos aceptan filtros combinados (gestión, financiador, región, área, rubro, cuenta, mes) y exportan a Excel y PDF; la exportación respeta el nivel desplegado en pantalla. El comparativo por gestión se activa al importar más de una gestión.

## Demostración de integridad (blockchain)

1. Auditoría e integridad → **Verificar integridad**: sistema íntegro.
2. Alterar un dato directamente en la base de datos:
   ```bash
   docker compose exec db psql -U postgres presupuesto -c "UPDATE movimientos SET debe_bs = debe_bs + 1000 WHERE id = 500"
   ```
3. **Verificar integridad** otra vez: el sistema detecta la alteración y muestra el movimiento y la fila del Excel original.
4. **Generar anclaje blockchain**: produce el hash raíz y el comando `ots stamp` para registrarlo en Bitcoin vía OpenTimestamps (`pip install opentimestamps-client`).

## API principal

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Inicio de sesión (JWT) |
| GET | `/api/catalogos` | Listas para filtros |
| GET | `/api/reportes/{rubro\|financiador\|area\|region\|mes}` | Reporte en árbol |
| GET | `/api/reportes/{tipo}/{excel\|pdf}` | Exportación (incluye `consolidado`) |
| GET | `/api/reportes/detalle` | Movimientos paginados |
| GET | `/api/reportes/resumen` | Consolidado, dashboard y alertas |
| GET | `/api/comparativo` | Comparativo entre gestiones |
| POST | `/api/importaciones` | Subir Excel |
| GET | `/api/auditoria/verificar` | Verificar cadena y raíz Merkle |
| POST | `/api/auditoria/anclajes` | Generar anclaje blockchain |
