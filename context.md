# CONTEXTO GENERAL DEL PROYECTO
**Proyecto:** Sistema Web de Control Presupuestario y Ejecución Financiera (`EducaBoliviaHackatonMeca`)
**Objetivo:** Desarrollar un aplicativo web interactivo para gestionar y generar 7 reportes financieros mediante consultas dinámicas, filtros combinados, visualización en dashboard y exportación a Excel/PDF.
**Estructura de Datos:** La información proviene originalmente de un Excel contable, migrada a un modelo relacional robusto en PostgreSQL que permite acumulación anual, modificaciones presupuestarias y reportes comparativos por gestión.
**Seguridad:** El sistema requiere Login/Sign-in con control de acceso por roles (Administradores que cargan y gestionan data; Usuarios Técnicos que consumen reportes y exportan).
**Identidad Visual (Paleta Institucional):**
- Fondo principal / blanco institucional: `#FFFFFF`
- Primario institucional / tinta y botones principales: `#417545`
- Acento / serie ejecutado y estados activos: `#26A567`
- Neutro / bordes suaves y textos secundarios: `#919090`
- Secundario / soporte visual y series complementarias: `#659184`

---

## PILA TECNOLÓGICA REAL (DETECTADA EN `basePage`)

- **Backend (`basePage/api`):** Python 3.11+ | Framework: FastAPI | Procesamiento: Pandas | Exportación: Excel/PDF
- **Frontend (`basePage/web`):** Node.js | Framework: React + Vite (SPA) | Gráficos & UI: Componentes modulares JSX (`Graficos.jsx`, `TablaArbol.jsx`, `Filtros.jsx`)
- **Base de Datos (`basePage/db`):** PostgreSQL (con soporte compatible para Supabase / PostgreSQL local)
- **Pruebas y Estrés (`basePage/pruebas`):** Scripts de validación de API, pruebas locales y simulación de carga (Locust / k6).

---

## INVENTARIO DE CÓDIGO BASE (BORRADOR EN `basePage/`)
*Regla crítica para las IAs: Ya existe una base funcional en `basePage/`. Antes de crear archivos desde cero, inspecciona, adapta y extiende los módulos existentes detallados a continuación:*

### 1. Base de Datos (`basePage/db/` y raíz)
- `init.sql` (Raíz): Script DDL listo para ejecutar en DBeaver. Contiene el Modelo Estrella MVP extraído de la hoja `DB` del Excel (dimensiones: `regiones`, `areas`, `rubros_cuentas`, `financiadores`; tabla central de hechos `movimientos` con saldo automático `STORED`, índices para filtros y 7 vistas SQL de reportes).
- `basePage/db/esquema.sql` (~58 KB): Definición avanzada alternativa con multi-gestión, control de usuarios y funciones PL/pgSQL.
- `basePage/db/postgres_propio.sql`: Configuración de roles y funciones de compatibilidad para PostgreSQL local.

### 2. Backend & API (`basePage/api/`)
- `main.py`: Punto de entrada de la aplicación FastAPI, configuración de CORS y montaje de rutas (incluye `POST /importaciones/automatico`).
- `autenticacion.py`: Lógica de autenticación, tokens JWT y validación de roles/permisos.
- `datos.py`: Endpoints y consultas para alimentación de catálogos, tableros y los 7 reportes dinámicos.
- `lector.py` (~29 KB): Motor ETL de lectura, limpieza y procesamiento de archivos Excel hacia PostgreSQL. Incluye `cargar_excel_automatico` para auto-poblar catálogos, presupuestos, movimientos y tasas en una sola transacción.
- `exportar.py` (~18 KB): Generación dinámica de reportes descargables en formatos Excel y PDF.
- `iniciar_db.py`: Script de inicialización y conexión con la base de datos.
- `generar_demo.py`: Generador de datos de prueba / exportación de dataset `demo.json`.
- `requirements.txt`: Dependencias de Python del proyecto.

### 3. Frontend (`basePage/web/`)
Configurado con **Vite + React** (`package.json`, `vite.config.js`, `index.html`):
- **Núcleo (`src/`):** `App.jsx` (enrutamiento y estado global), `main.jsx`, `config.js`, `index.css` (tokens con paleta institucional verde `#FFFFFF`, `#417545`, `#26A567`, `#919090`, `#659184`).
- **Páginas (`src/paginas/`):**
  - `Login.jsx`: Vista de inicio de sesión y gestión de credenciales con paleta institucional verde.
  - `Tablero.jsx`: Dashboard principal con KPIs y resumen ejecutivo.
  - `Reportes.jsx`: Vista interactiva para los 7 reportes financieros y despliegue de niveles.
  - `Importar.jsx`: Interfaz de administrador para carga y validación de archivos Excel con vista previa.
  - `Administracion.jsx`: Gestión de usuarios, roles, parámetros del sistema y pestaña **Carga automática** para subir el Excel `.xlsx`/`.xlsm` y normalizar toda la base de datos en un paso.
  - `Modificaciones.jsx`: Visualización y gestión de modificaciones presupuestarias.
  - `Movimientos.jsx`: Detalle y consulta de movimientos contables/financieros.
- **Componentes Reutilizables (`src/componentes/`):**
  - `Layout.jsx`: Estructura base, barra lateral y navegación por rol.
  - `Sesion.jsx`: Control y persistencia de sesión en cliente.
  - `Filtros.jsx`: Barra de filtros combinados cruzados (gestión, mes, financiador, región, área, rubro).
  - `TablaArbol.jsx`: Tabla jerárquica desplegable por niveles (ej. Rubro -> Cuenta).
  - `Graficos.jsx`: Visualizaciones interactivas del dashboard (series en `#26A567`, `#417545`, `#659184` y barras de presupuesto `#a8dfc3`).
  - `Ui.jsx`: Componentes base de interfaz.
- **Capa de Datos y Utilidades (`src/datos/` y `src/lib/`):**
  - `datos/api.js`, `datos/supabase.js`, `datos/demo.js`, `datos/motor.js` (~20 KB, motor de agregación/filtrado en cliente), `datos/comun.js` (con `subirExcelAutomatico`), `datos/index.js`.
  - `lib/descargas.js`, `lib/formato.js`, `lib/reportes.js`, `lib/ruta.js`, `lib/usar.js`.
- **Assets Públicos (`public/`):** `demo.json` (dataset estático de respaldo/demo), `config.js`.

### 4. Pruebas (`basePage/pruebas/`)
- `probar_api.py`: Suite de pruebas automatizadas contra los endpoints de FastAPI.
- `probar_local.py`: Pruebas de integración del flujo completo en entorno local.
- `simular_supabase.sql`: Script SQL para emular roles/políticas de Supabase en PostgreSQL estándar.

---

# CONTEXTO Y ESTADO POR INTEGRANTE (ZONAS DE AGENTES)
*Regla para las IAs: Lee todo el documento para entender el proyecto, pero modifica y escribe código **únicamente** basándote en la zona correspondiente al rol actual del usuario que te consulta.*

-----------MATEO (ARQUITECTURA BD Y POSTGRESQL)-------------
**Agente de Mateo:** Tu objetivo es auditar, modelar, optimizar y gestionar la base de datos en PostgreSQL, evitando cuellos de botella bajo estrés.
- **Estado Actual:** Script `init.sql` creado en la raíz del repositorio, listo para ejecutar en DBeaver. Implementa el Modelo Estrella MVP derivado de la hoja `DB` del Excel institucional.
- **Última Acción:** Creación del script `init.sql` con 4 tablas dimensionales, tabla de hechos central `movimientos` con columna generada `saldo STORED`, índices para filtros cruzados y 7 vistas SQL que reemplazan las tablas dinámicas de Excel.
- **Esquema/Tablas Activas:**
  - **Tablas Dimensionales:**
    * `regiones` (`id`, `nombre`, `creado_en`)
    * `areas` (`id`, `nombre`, `creado_en`)
    * `rubros_cuentas` (`id`, `rubro`, `cuenta`, `creado_en`, con restricción `UNIQUE(rubro, cuenta)`)
    * `financiadores` (`id`, `nombre`, `creado_en`)
  - **Tabla de Hechos Central:**
    * `movimientos` (`id`, `region_id`, `area_id`, `rubro_cuenta_id`, `financiador_id`, `fecha`, `mes`, `codigo`, `nombre_detalle`, `tipo`, `numero_comprobante`, `no_cheque`, `ref`, `presupuesto`, `ejecucion`, `saldo` [GENERATED ALWAYS AS (presupuesto - ejecucion) STORED])
  - **Vistas SQL para Reportes:**
    * `vista_reporte_rubros` (Ejecución agregada por rubro)
    * `vista_reporte_rubros_cuentas` (Nivel detallado por rubro y cuenta)
    * `vista_reporte_financiadores` (Ejecución agregada por financiador/fondo)
    * `vista_reporte_regiones` (Ejecución agregada por región)
    * `vista_reporte_area_financiador` (Cruce de área y financiador)
    * `vista_reporte_mes` (Ejecución mensual acumulada)
    * `vista_reporte_resumen_general` (Totales globales y porcentaje de ejecución)
- **Tareas Pendientes:**
  - [x] Diseñar modelo en estrella y generar `init.sql` para DBeaver.
  - [ ] Ejecutar `init.sql` en DBeaver sobre la base de datos PostgreSQL local.
  - [ ] Coordinar con Marck (Backend) para el mapeo de columnas de `pd.read_excel(sheet_name='DB')` hacia las tablas dimensionales y `movimientos`.
  - [ ] Monitorear rendimiento y evaluar `MATERIALIZED VIEW` si las pruebas de estrés de Miguel muestran latencia.

-----------MARCK (BACKEND Y API)-------------
**Agente de Marck:** Tu objetivo es refinar y completar la API RESTful en `basePage/api/`, asegurar el procesamiento ETL de Excel y la exportación Excel/PDF.
- **Estado Actual:** Backend funcional en `basePage/api/` con soporte tanto para importación con borrador/vista previa (`POST /importaciones` + `POST /importaciones/{id}/confirmar`) como para carga y normalización automática directa (`POST /importaciones/automatico`).
- **Última Acción:** Implementación de `cargar_excel_automatico` en `lector.py` y el endpoint `POST /importaciones/automatico` en `main.py` (restringido a rol `admin`). Este flujo lee el `.xlsx`/`.xlsm`, normaliza catálogos (`financiadores`, `regiones`, `areas`, `rubros`, `cuentas`), deduce gestiones y tasas de cambio desde los movimientos, reemplaza o inserta presupuestos y movimientos y deja trazabilidad en `importaciones`.
- **Contrato de API (Endpoints Expuestos):**
  - `POST /importaciones`: Sube archivo Excel y genera borrador con validaciones y vista previa de diferencias.
  - `POST /importaciones/{id}/confirmar`: Aplica un borrador de importación a las tablas definitivas.
  - `POST /importaciones/{id}/descartar`: Elimina un borrador pendiente.
  - `POST /importaciones/automatico` (Solo `admin`): Recibe `archivo` (`.xlsx`/`.xlsm`) y `gestion` opcional; ejecuta ETL completo, auto-crea catálogos y aplica presupuestos y movimientos de inmediato.
  - `POST /rpc/{fn}`: Ejecuta funciones SQL (`reporte_json`, `resumen_general`, `detalle_movimientos`, `alertas_ejecucion`, etc.).
  - `POST /exportar`: Genera reportes descargables en formatos `xlsx` y `pdf`.
- **Tareas Pendientes:**
  - [x] Implementar carga y normalización automática de Excel desde el endpoint administrativo (`POST /importaciones/automatico`).
  - [ ] Verificar en entorno real que `lector.py` procese el Excel institucional (`Prueba ExB Nov 2026.xlsx`) sin errores de tipos y registre el *Audit Trail*.
  - [ ] Validar que `datos.py` y `exportar.py` soporten todos los filtros combinados y niveles de detalle de los 7 reportes.
  Es un intneto de chatbot. 

-----------NAT (FRONTEND, REPORTES Y DASHBOARD)-------------
**Agente de Nat:** Tu objetivo es pulir la interfaz web en `basePage/web/`, conectar todas las vistas con el Backend real y optimizar UI/UX.
- **Estado Actual:** Aplicación React + Vite actualizada con la identidad visual institucional en verde (`#FFFFFF`, `#417545`, `#26A567`, `#919090`, `#659184`) y módulo de **Carga automática** integrado en el panel de Administración.
- **Última Acción:**
  1. Actualización global de la paleta de colores en `index.css`, `Graficos.jsx`, `Layout.jsx`, `Login.jsx`, `Filtros.jsx`, `TablaArbol.jsx`, `Ui.jsx`, `Importar.jsx`, `Movimientos.jsx` y `Reportes.jsx`.
  2. Incorporación de la pestaña **Carga automática** en `Administracion.jsx` y el método `subirExcelAutomatico` en `datos/comun.js`, `datos/api.js`, `datos/supabase.js` y `datos/demo.js`, permitiendo que el administrador suba el Excel y organice catálogos y datos con un clic.
- **Componentes Principales:**
  - Vistas en `src/paginas/`, filtros cruzados en `Filtros.jsx`, tabla jerárquica en `TablaArbol.jsx` y gráficos en `Graficos.jsx`.
- **Tareas Pendientes:**
  - [x] Aplicar paleta institucional verde (`#FFFFFF`, `#417545`, `#26A567`, `#919090`, `#659184`) en toda la SPA.
  - [x] Crear interfaz de carga automática de Excel en `Administracion.jsx`.
  - [ ] Configurar `API_URL` en `config.js` (y/o cambiar `MODO` a `'api'` o `'supabase'` con API activa) para operar contra FastAPI en producción.
  - [ ] Validar que los 7 reportes en `Reportes.jsx` desplieguen niveles de detalle y disparen descargas Excel/PDF correctamente.

  keys:
  window.CONFIG = {
  MODO: 'supabase',
  SUPABASE_URL: 'https://rvcnxlqvurrzbhrxqlnl.supabase.co',          // https://rvcnxlqvurrzbhrxqlnl.supabase.co
  SUPABASE_KEY: 'sb_publishable_hY7YWe2jgEmdAa0cFpnFvQ_5JJGJzvC',          // sb_publishable_hY7YWe2jgEmdAa0cFpnFvQ_5JJGJzvC
  API_URL: '',               // https://tu-api.onrender.com
  ORGANIZACION: 'Enseña por Bolivia',          // Ense
  
}

-----------MIGUEL (INTEGRACIÓN, PRUEBAS DE ESTRÉS Y UVPs)-------------
**Agente de Miguel:** Tu objetivo es unificar el flujo Front-Back-BD, validar el Audit Trail y ejecutar pruebas de estrés (50-100 usuarios concurrentes).
- **Estado Actual:** Scripts base disponibles en `basePage/pruebas/` (`probar_api.py`, `probar_local.py`, `simular_supabase.sql`).
- **Última Acción:** Incorporación de scripts de prueba iniciales en `basePage/pruebas`.
- **Métricas de Rendimiento:**
  - *(Registrar aquí latencias p95/p99 tras ejecutar `probar_api.py` y Locust/k6)*
- **Tareas Pendientes:**
  - [ ] Ejecutar `probar_local.py` y `probar_api.py` para verificar la integración end-to-end (incluyendo el flujo de carga automática de Excel).
  - [ ] Crear script de pruebas de estrés (Locust/k6) simulando 50-100 usuarios técnicos consultando y exportando los 7 reportes simultáneamente.