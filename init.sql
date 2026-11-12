-- =============================================================================
-- SISTEMA DE CONTROL PRESUPUESTARIO Y EJECUCIÓN FINANCIERA (EducaBolivia)
-- Script: init.sql
-- Objetivo: Modelo estrella relacional e inicialización de vistas para DBeaver
-- Autor / Rol: Mateo (Arquitectura de Base de Datos y PostgreSQL)
-- =============================================================================

-- 1. LIMPIEZA PREVIA (Opcional, en cascada para facilitar pruebas y desarrollo)
DROP VIEW IF EXISTS vista_reporte_resumen_general CASCADE;
DROP VIEW IF EXISTS vista_reporte_mes CASCADE;
DROP VIEW IF EXISTS vista_reporte_area_financiador CASCADE;
DROP VIEW IF EXISTS vista_reporte_rubros_cuentas CASCADE;
DROP VIEW IF EXISTS vista_reporte_regiones CASCADE;
DROP VIEW IF EXISTS vista_reporte_financiadores CASCADE;
DROP VIEW IF EXISTS vista_reporte_rubros CASCADE;

DROP TABLE IF EXISTS movimientos CASCADE;
DROP TABLE IF EXISTS financiadores CASCADE;
DROP TABLE IF EXISTS rubros_cuentas CASCADE;
DROP TABLE IF EXISTS areas CASCADE;
DROP TABLE IF EXISTS regiones CASCADE;

-- =============================================================================
-- 2. TABLAS DIMENSIONALES (Aislamiento de atributos repetitivos de la hoja DB)
-- =============================================================================

-- Dimensión 1: Regiones (Columna 'region')
CREATE TABLE regiones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Dimensión 2: Áreas (Columna 'area')
CREATE TABLE areas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Dimensión 3: Rubros y Cuentas (Columnas 'rubro' y 'Cuenta')
CREATE TABLE rubros_cuentas (
    id SERIAL PRIMARY KEY,
    rubro VARCHAR(150) NOT NULL,
    cuenta VARCHAR(150) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rubro_cuenta UNIQUE (rubro, cuenta)
);

-- Dimensión 4: Financiadores / Fondos (Columna 'fondo')
CREATE TABLE financiadores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 3. TABLA DE HECHOS CENTRAL (Transacciones y métricas financieras de la hoja DB)
-- =============================================================================

CREATE TABLE movimientos (
    id BIGSERIAL PRIMARY KEY,
    
    -- Claves foráneas a dimensiones
    region_id INT NOT NULL REFERENCES regiones(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    area_id INT NOT NULL REFERENCES areas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    rubro_cuenta_id INT NOT NULL REFERENCES rubros_cuentas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    financiador_id INT NOT NULL REFERENCES financiadores(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    -- Atributos transaccionales
    fecha DATE,                                      -- De 'cfecha'
    mes SMALLINT CHECK (mes BETWEEN 1 AND 12),       -- De 'mes'
    codigo VARCHAR(100),                             -- De 'codigo'
    nombre_detalle TEXT,                             -- De 'nombre'
    tipo VARCHAR(50),                                -- De 'tipo'
    numero_comprobante VARCHAR(50),                  -- De 'numero'
    no_cheque VARCHAR(100),                          -- De 'no_cheque'
    ref TEXT,                                        -- De 'ref'
    
    -- Métricas financieras en Bolivianos (Bs)
    presupuesto DECIMAL(15,2) NOT NULL DEFAULT 0.00, -- De 'presupuesto'
    ejecucion DECIMAL(15,2) NOT NULL DEFAULT 0.00,   -- De 'Ejecución'
    
    -- Columna calculada y almacenada para rendimiento instantáneo
    saldo DECIMAL(15,2) GENERATED ALWAYS AS (presupuesto - ejecucion) STORED,
    
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 4. ÍNDICES DE ALTO RENDIMIENTO (Optimizados para filtros cruzados y estrés)
-- =============================================================================

CREATE INDEX idx_movimientos_region ON movimientos(region_id);
CREATE INDEX idx_movimientos_area ON movimientos(area_id);
CREATE INDEX idx_movimientos_rubro_cuenta ON movimientos(rubro_cuenta_id);
CREATE INDEX idx_movimientos_financiador ON movimientos(financiador_id);
CREATE INDEX idx_movimientos_mes ON movimientos(mes);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX idx_movimientos_filtros_combinados ON movimientos(financiador_id, region_id, mes);

-- =============================================================================
-- 5. VISTAS SQL PARA REPORTES DINÁMICOS (Reemplazo de tablas dinámicas de Excel)
-- =============================================================================

-- Reporte 1: Ejecución por Rubro
CREATE OR REPLACE VIEW vista_reporte_rubros AS
SELECT 
    rc.rubro,
    SUM(m.presupuesto) AS suma_presupuesto_bs,
    SUM(m.ejecucion) AS suma_ejecucion,
    SUM(m.saldo) AS saldo,
    ROUND((SUM(m.ejecucion) / NULLIF(SUM(m.presupuesto), 0)) * 100, 2) AS porcentaje_ejecucion
FROM movimientos m
JOIN rubros_cuentas rc ON m.rubro_cuenta_id = rc.id
GROUP BY rc.rubro
ORDER BY rc.rubro;

-- Reporte 1.b: Ejecución por Rubro y Cuenta (Nivel detallado)
CREATE OR REPLACE VIEW vista_reporte_rubros_cuentas AS
SELECT 
    rc.rubro,
    rc.cuenta,
    SUM(m.presupuesto) AS suma_presupuesto_bs,
    SUM(m.ejecucion) AS suma_ejecucion,
    SUM(m.saldo) AS saldo,
    ROUND((SUM(m.ejecucion) / NULLIF(SUM(m.presupuesto), 0)) * 100, 2) AS porcentaje_ejecucion
FROM movimientos m
JOIN rubros_cuentas rc ON m.rubro_cuenta_id = rc.id
GROUP BY rc.rubro, rc.cuenta
ORDER BY rc.rubro, rc.cuenta;

-- Reporte 2: Ejecución por Financiador (Fondo)
CREATE OR REPLACE VIEW vista_reporte_financiadores AS
SELECT 
    f.nombre AS financiador,
    SUM(m.presupuesto) AS suma_presupuesto_bs,
    SUM(m.ejecucion) AS suma_ejecucion,
    SUM(m.saldo) AS saldo,
    ROUND((SUM(m.ejecucion) / NULLIF(SUM(m.presupuesto), 0)) * 100, 2) AS porcentaje_ejecucion
FROM movimientos m
JOIN financiadores f ON m.financiador_id = f.id
GROUP BY f.nombre
ORDER BY f.nombre;

-- Reporte 3: Ejecución por Región
CREATE OR REPLACE VIEW vista_reporte_regiones AS
SELECT 
    r.nombre AS region,
    SUM(m.presupuesto) AS suma_presupuesto_bs,
    SUM(m.ejecucion) AS suma_ejecucion,
    SUM(m.saldo) AS saldo,
    ROUND((SUM(m.ejecucion) / NULLIF(SUM(m.presupuesto), 0)) * 100, 2) AS porcentaje_ejecucion
FROM movimientos m
JOIN regiones r ON m.region_id = r.id
GROUP BY r.nombre
ORDER BY r.nombre;

-- Reporte 4: Ejecución por Área y Financiador
CREATE OR REPLACE VIEW vista_reporte_area_financiador AS
SELECT 
    a.nombre AS area,
    f.nombre AS financiador,
    SUM(m.presupuesto) AS suma_presupuesto_bs,
    SUM(m.ejecucion) AS suma_ejecucion,
    SUM(m.saldo) AS saldo,
    ROUND((SUM(m.ejecucion) / NULLIF(SUM(m.presupuesto), 0)) * 100, 2) AS porcentaje_ejecucion
FROM movimientos m
JOIN areas a ON m.area_id = a.id
JOIN financiadores f ON m.financiador_id = f.id
GROUP BY a.nombre, f.nombre
ORDER BY a.nombre, f.nombre;

-- Reporte 5: Ejecución por Mes
CREATE OR REPLACE VIEW vista_reporte_mes AS
SELECT 
    m.mes,
    SUM(m.presupuesto) AS suma_presupuesto_bs,
    SUM(m.ejecucion) AS suma_ejecucion,
    SUM(m.saldo) AS saldo,
    ROUND((SUM(m.ejecucion) / NULLIF(SUM(m.presupuesto), 0)) * 100, 2) AS porcentaje_ejecucion
FROM movimientos m
GROUP BY m.mes
ORDER BY m.mes;

-- Reporte 6: Resumen General Consolidado
CREATE OR REPLACE VIEW vista_reporte_resumen_general AS
SELECT 
    COUNT(m.id) AS total_movimientos,
    SUM(m.presupuesto) AS total_presupuesto_bs,
    SUM(m.ejecucion) AS total_ejecucion_bs,
    SUM(m.saldo) AS total_saldo_bs,
    ROUND((SUM(m.ejecucion) / NULLIF(SUM(m.presupuesto), 0)) * 100, 2) AS porcentaje_ejecucion_global
FROM movimientos m;
