-- ============================================================
-- CierreCaja Pro — IMPRIMEYA · Esquema PostgreSQL
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USUARIOS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id         BIGINT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  pin        VARCHAR(10)  NOT NULL UNIQUE,
  rol        VARCHAR(20)  NOT NULL DEFAULT 'cajero',
  modulos    JSONB        NOT NULL DEFAULT '["dashboard","pos"]',
  activo     BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO usuarios (id, nombre, pin, rol, modulos) VALUES
  (1, 'Administrador', '1234', 'admin',  '["dashboard","pos","ingresos","egresos","graficas","depositos","historial","config"]'),
  (2, 'Cajero 1',      '0001', 'cajero', '["dashboard","pos"]'),
  (3, 'Cajero 2',      '0002', 'cajero', '["dashboard","pos"]')
ON CONFLICT (id) DO NOTHING;

-- ── VENTAS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas (
  id              BIGINT PRIMARY KEY,
  numero          VARCHAR(20),
  fecha           VARCHAR(30),
  hora            VARCHAR(20),
  fecha_iso       DATE,
  cajero          VARCHAR(100),
  cliente         VARCHAR(100),
  metodo          VARCHAR(50),
  total           NUMERIC(10,2) DEFAULT 0,
  utilidad        NUMERIC(10,2) DEFAULT 0,
  pago_servicio   NUMERIC(10,2) DEFAULT 0,
  recibido        NUMERIC(10,2) DEFAULT 0,
  vuelto          NUMERIC(10,2) DEFAULT 0,
  items           JSONB         DEFAULT '[]',
  cierre_id       BIGINT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha   ON ventas(fecha_iso);
CREATE INDEX IF NOT EXISTS idx_ventas_metodo  ON ventas(metodo);
CREATE INDEX IF NOT EXISTS idx_ventas_cierre  ON ventas(cierre_id);

-- ── GASTOS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gastos (
  id          BIGINT PRIMARY KEY,
  cat         VARCHAR(80),
  descripcion TEXT,
  monto       NUMERIC(10,2) DEFAULT 0,
  cajero      VARCHAR(100),
  fecha       VARCHAR(30),
  fecha_iso   DATE,
  cierre_id   BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gastos_fecha  ON gastos(fecha_iso);
CREATE INDEX IF NOT EXISTS idx_gastos_cierre ON gastos(cierre_id);

-- ── CIERRES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cierres (
  id                  BIGINT PRIMARY KEY,
  fecha               TIMESTAMPTZ,
  fecha_iso           DATE,
  cajero              VARCHAR(100),
  ventas              NUMERIC(10,2) DEFAULT 0,
  egresos             NUMERIC(10,2) DEFAULT 0,
  utilidad            NUMERIC(10,2) DEFAULT 0,
  contado             NUMERIC(10,2) DEFAULT 0,
  dif                 NUMERIC(10,2) DEFAULT 0,
  fondo_vuelto        NUMERIC(10,2) DEFAULT 0,
  a_depositar         NUMERIC(10,2) DEFAULT 0,
  total_depositado    NUMERIC(10,2) DEFAULT 0,
  saldo_pendiente     NUMERIC(10,2) DEFAULT 0,
  depositos_parciales JSONB         DEFAULT '[]',
  obs                 TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cierres_fecha ON cierres(fecha_iso);

-- ── DEPÓSITOS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS depositos (
  id          BIGINT PRIMARY KEY,
  fecha_dep   DATE,
  banco       VARCHAR(100),
  ref         VARCHAR(100),
  monto       NUMERIC(10,2) DEFAULT 0,
  cierre_ids  JSONB         DEFAULT '[]',
  cajero      VARCHAR(100),
  periodo     VARCHAR(100),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_depositos_fecha ON depositos(fecha_dep);

-- ── AUDITORÍA ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria (
  id          SERIAL PRIMARY KEY,
  usuario     VARCHAR(100),
  tipo        VARCHAR(50),
  detalle     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario);
CREATE INDEX IF NOT EXISTS idx_auditoria_tipo    ON auditoria(tipo);

-- ── CONFIGURACIÓN ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion (
  id              INT PRIMARY KEY DEFAULT 1,
  negocio         VARCHAR(120) DEFAULT 'IMPRIMEYA Copias & Servicios',
  ruc             VARCHAR(20)  DEFAULT '',
  direccion       TEXT         DEFAULT '',
  telefono        VARCHAR(20)  DEFAULT '',
  logo            TEXT,
  fondo_inicial   NUMERIC(10,2) DEFAULT 20,
  fondo_vuelto    NUMERIC(10,2) DEFAULT 35,
  precio_bn       NUMERIC(6,3)  DEFAULT 0.05,
  precio_color    NUMERIC(6,3)  DEFAULT 0.15,
  metodos_pago    JSONB DEFAULT '["Efectivo","Transferencia","Zelle","Tarjeta"]',
  cats_gasto      JSONB DEFAULT '["Papel/Suministros","Toner/Tinta","Internet","Comida","Transporte","Otros"]',
  servicios       JSONB DEFAULT '[]',
  updated_at      TIMESTAMPTZ
);

INSERT INTO configuracion (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── VISTAS ÚTILES ─────────────────────────────────────────────
CREATE OR REPLACE VIEW v_resumen_diario AS
SELECT
  fecha_iso,
  COUNT(*)                          AS num_ventas,
  SUM(total)                        AS total_ventas,
  SUM(utilidad)                     AS utilidad_bruta,
  COUNT(*) FILTER (WHERE metodo = 'Efectivo')      AS ventas_efectivo,
  COUNT(*) FILTER (WHERE metodo = 'Transferencia') AS ventas_transferencia,
  COUNT(*) FILTER (WHERE metodo = 'Zelle')         AS ventas_zelle,
  COUNT(*) FILTER (WHERE metodo = 'Tarjeta')       AS ventas_tarjeta
FROM ventas
GROUP BY fecha_iso
ORDER BY fecha_iso DESC;

CREATE OR REPLACE VIEW v_estado_cierres AS
SELECT
  id,
  fecha_iso,
  cajero,
  a_depositar,
  total_depositado,
  saldo_pendiente,
  CASE
    WHEN saldo_pendiente <= 0.005 THEN 'conciliado'
    WHEN total_depositado > 0     THEN 'parcial'
    ELSE 'pendiente'
  END AS estado
FROM cierres
ORDER BY fecha_iso DESC;
