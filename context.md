# CONTEXTO GENERAL DEL PROYECTO
**Proyecto:** Sistema Web de Control Presupuestario y Ejecución Financiera
**Objetivo:** Desarrollar un aplicativo web interactivo para gestionar y generar 7 reportes financieros mediante consultas dinámicas, filtros combinados, visualización en dashboard y exportación a Excel/PDF.
**Estructura de Datos:** La información proviene originalmente de un Excel, pero migrará a un modelo relacional robusto que permita acumulación anual y reportes comparativos.
**Seguridad:** El sistema requiere Login/Sign-in, diferenciando perfiles (Administradores que cargan data y Usuarios Técnicos que consumen reportes).

---

## PILA TECNOLÓGICA Y VERSIONES
*Por favor, actualizar esta sección con las versiones exactas a medida que se decidan en el equipo.*

- **Backend:** Python `[Versión, ej. 3.11+]` | Framework: FastAPI | Procesamiento: Pandas
- **Frontend:** Node.js `[Versión, ej. 20.x]` | Framework: React / Next.js `[Versión]` | Gráficos: `[Librería, ej. Recharts]`
- **Base de Datos:** PostgreSQL `[Versión, ej. 15.x]`
- **Infraestructura:** Despliegue local (fase inicial). Herramientas de estrés: Locust / k6.

---

# CONTEXTO Y ESTADO POR INTEGRANTE (ZONAS DE AGENTES)
*Regla para las IAs: Lee todo el documento para entender el proyecto, pero modifica y escribe código **únicamente** basándote en la zona correspondiente al rol actual del usuario que te consulta.*

-----------MATEO (ARQUITECTURA BD Y POSTGRESQL)-------------
**Agente de Mateo:** Tu objetivo es modelar, optimizar y gestionar la base de datos PostgreSQL. Evitar cuellos de botella para el estrés.
- **Estado Actual:** [Escribir aquí el estado actual]
- **Última Acción:** [Ej. Creación de modelo E-R o Script inicial]
- **Esquema/Tablas Activas:**
  *(Pegar aquí el esquema de BD o listado de tablas actualizadas para que el Backend sepa qué consultar)*
- **Tareas Pendientes:**
  - [ ] ...

-----------MARCK (BACKEND Y API)-------------
**Agente de Marck:** Tu objetivo es crear la API RESTful en FastAPI, procesar Excel con Pandas y generar PDFs/Excels de exportación.
- **Estado Actual:** [Escribir aquí el estado actual]
- **Última Acción:** [Ej. Configuración inicial de rutas de autenticación JWT]
- **Contrato de API (Endpoints Expuestos):**
  *(Listar aquí las rutas disponibles, ej. `GET /api/v1/reports/summary` para que el Frontend sepa cómo conectarse)*
- **Tareas Pendientes:**
  - [ ] ...

-----------NAT (FRONTEND, REPORTES Y DASHBOARD)-------------
**Agente de Nat:** Tu objetivo es construir la interfaz web, el dashboard interactivo y consumir la API del Backend. Céntrate en UI/UX y la lógica de filtrado cruzado.
- **Estado Actual:** [Escribir aquí el estado actual]
- **Última Acción:** [Ej. Inicialización del proyecto Next.js y vistas de Login/Sign-in]
- **Componentes Principales:**
  *(Listar aquí el estado de las vistas, ej. "Filtros de región: Terminados")*
- **Tareas Pendientes:**
  - [ ] ...

-----------MIGUEL (INTEGRACIÓN, PRUEBAS DE ESTRÉS Y UVPs)-------------
**Agente de Miguel:** Tu objetivo es unificar el sistema, garantizar que el flujo Front-Back-BD sea perfecto, desarrollar el Audit Trail e inyectar tráfico simulado (k6/Locust).
- **Estado Actual:** [Escribir aquí el estado actual]
- **Última Acción:** [Ej. Creación de script de pruebas Locust básico]
- **Métricas de Rendimiento:**
  *(Anotar aquí los resultados de latencia o cuellos de botella encontrados)*
- **Tareas Pendientes:**
  - [ ] ...