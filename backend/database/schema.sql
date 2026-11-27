-- =====================================================================
--  BASE DE DATOS: restaurante   (PostgreSQL)
--  Crea todas las tablas del sistema de pedidos.
--  Se ejecuta UNA vez (o cada vez que quieras empezar de cero).
-- =====================================================================

-- Borra las tablas si ya existían (en orden inverso a las dependencias)
DROP VIEW  IF EXISTS v_platos_mas_pedidos;
DROP TABLE IF EXISTS imagenes, cupones, combo_platos, promociones, pagos, detalle_pedido,
                     pedidos, cuentas, personal, metodos_pago, clientes,
                     mesas, platos, categorias CASCADE;

-- ---------------------------------------------------------------------
-- 1. CARTA
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id      SERIAL PRIMARY KEY,                 -- SERIAL = número que se autoincrementa
  nombre  VARCHAR(50) NOT NULL UNIQUE,
  orden   INT NOT NULL DEFAULT 0              -- para ordenar en la carta
);

CREATE TABLE platos (
  id            SERIAL PRIMARY KEY,
  categoria_id  INT NOT NULL REFERENCES categorias(id),   -- FOREIGN KEY: el plato pertenece a una categoría
  nombre        VARCHAR(100) NOT NULL,
  descripcion   TEXT,
  precio        NUMERIC(8,2) NOT NULL CHECK (precio >= 0),
  imagen_url    TEXT,
  disponible    BOOLEAN NOT NULL DEFAULT TRUE,
  eliminado     BOOLEAN NOT NULL DEFAULT FALSE   -- ya pedido alguna vez: se oculta en vez de borrarse
);

-- Fotos subidas desde el panel de admin (se guardan en la base porque
-- Render gratis borra los archivos subidos al reiniciarse)
CREATE TABLE imagenes (
  id         SERIAL PRIMARY KEY,
  tipo       VARCHAR(30) NOT NULL,
  datos      BYTEA NOT NULL,
  creado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. MESAS
-- ---------------------------------------------------------------------
CREATE TABLE mesas (
  id      SERIAL PRIMARY KEY,
  numero  INT NOT NULL UNIQUE,
  codigo  VARCHAR(20) NOT NULL UNIQUE          -- lo que va dentro del QR (ej: M05-K7Q2)
);

-- ---------------------------------------------------------------------
-- 3. PERSONAS: clientes registrados y personal del restaurante
-- ---------------------------------------------------------------------
CREATE TABLE clientes (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  email          VARCHAR(120) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,                -- NUNCA se guarda la contraseña real
  creado_en      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tarjetas / cuentas guardadas (simulado: solo los últimos 4 dígitos)
CREATE TABLE metodos_pago (
  id          SERIAL PRIMARY KEY,
  cliente_id  INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('tarjeta','yape','plin')),
  marca       VARCHAR(20),                     -- Visa, Mastercard... (solo tarjetas)
  ultimos4    CHAR(4) NOT NULL,                -- últimos 4 dígitos de la tarjeta o del celular
  creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE personal (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  usuario        VARCHAR(50) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  rol            VARCHAR(10) NOT NULL CHECK (rol IN ('cocina','mesero','caja','admin')),
  activo         BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------
-- 4. CUENTAS Y PEDIDOS
--    cuenta = la "visita" de una mesa. Dentro de una cuenta puede haber
--    varios pedidos (primero la comida, luego el heladito).
-- ---------------------------------------------------------------------
CREATE TABLE cuentas (
  id          SERIAL PRIMARY KEY,
  mesa_id     INT NOT NULL REFERENCES mesas(id),
  cliente_id  INT REFERENCES clientes(id),     -- NULL = invitado (no registrado)
  estado      VARCHAR(10) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','cerrada')),
  abierta_en  TIMESTAMP NOT NULL DEFAULT NOW(),
  cerrada_en  TIMESTAMP
);
-- Una mesa solo puede tener UNA cuenta abierta a la vez (índice único parcial)
CREATE UNIQUE INDEX una_cuenta_abierta_por_mesa ON cuentas (mesa_id) WHERE estado = 'abierta';

CREATE TABLE pedidos (
  id              SERIAL PRIMARY KEY,
  cuenta_id       INT NOT NULL REFERENCES cuentas(id),
  codigo          VARCHAR(10) NOT NULL UNIQUE, -- código corto que ve el cliente (ej: A23)
  estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente_pago'
                  CHECK (estado IN ('pendiente_pago','pagado','en_preparacion',
                                    'listo','entregado','cancelado')),
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  descuento       NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  mesero_id       INT REFERENCES personal(id), -- quién lo llevó a la mesa
  creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Cada fila = un plato dentro de un pedido
CREATE TABLE detalle_pedido (
  id               SERIAL PRIMARY KEY,
  pedido_id        INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  plato_id         INT NOT NULL REFERENCES platos(id),
  cantidad         INT NOT NULL CHECK (cantidad > 0),
  precio_unitario  NUMERIC(8,2) NOT NULL,      -- precio del momento (si luego sube, no cambia)
  nota             VARCHAR(200),               -- "sin cebolla"
  es_regalo        BOOLEAN NOT NULL DEFAULT FALSE  -- TRUE si vino gratis por una promo
);

CREATE TABLE pagos (
  id          SERIAL PRIMARY KEY,
  pedido_id   INT NOT NULL UNIQUE REFERENCES pedidos(id),   -- un pago por pedido
  metodo      VARCHAR(10) NOT NULL CHECK (metodo IN ('tarjeta','yape','plin','efectivo')),
  monto       NUMERIC(10,2) NOT NULL,
  estado      VARCHAR(12) NOT NULL DEFAULT 'pendiente'
              CHECK (estado IN ('pendiente','aprobado','reembolsado')),
  operacion   VARCHAR(30),                     -- n° de operación simulado
  cajero_id   INT REFERENCES personal(id),     -- solo cuando se paga en efectivo
  creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5. PROMOCIONES
--   tipo 'descuento_siguiente': si el pedido supera monto_minimo, el
--        cliente registrado recibe un cupón de 'porcentaje' % para después.
--   tipo 'regalo': al pedir plato_id te regalan plato_regalo_id.
--   tipo 'combo':  varios platos (tabla combo_platos) a precio_combo.
-- ---------------------------------------------------------------------
CREATE TABLE promociones (
  id                SERIAL PRIMARY KEY,
  titulo            VARCHAR(100) NOT NULL,
  descripcion       TEXT,
  tipo              VARCHAR(20) NOT NULL CHECK (tipo IN ('descuento_siguiente','regalo','combo')),
  monto_minimo      NUMERIC(10,2),             -- para 'descuento_siguiente'
  porcentaje        NUMERIC(5,2),              -- para 'descuento_siguiente'
  plato_id          INT REFERENCES platos(id), -- para 'regalo': plato que activa la promo
  plato_regalo_id   INT REFERENCES platos(id), -- para 'regalo': lo que te regalan
  precio_combo      NUMERIC(10,2),             -- para 'combo'
  solo_registrados  BOOLEAN NOT NULL DEFAULT FALSE,
  activa            BOOLEAN NOT NULL DEFAULT TRUE,
  inicio            DATE NOT NULL DEFAULT CURRENT_DATE,
  fin               DATE
);

-- Qué platos trae cada combo (relación muchos a muchos)
CREATE TABLE combo_platos (
  promocion_id  INT NOT NULL REFERENCES promociones(id) ON DELETE CASCADE,
  plato_id      INT NOT NULL REFERENCES platos(id),
  cantidad      INT NOT NULL DEFAULT 1,
  PRIMARY KEY (promocion_id, plato_id)         -- llave primaria compuesta
);

-- Cupones ganados por clientes registrados
CREATE TABLE cupones (
  id                SERIAL PRIMARY KEY,
  cliente_id        INT NOT NULL REFERENCES clientes(id),
  promocion_id      INT NOT NULL REFERENCES promociones(id),
  porcentaje        NUMERIC(5,2) NOT NULL,
  pedido_origen_id  INT REFERENCES pedidos(id),  -- pedido con el que lo ganó
  pedido_uso_id     INT REFERENCES pedidos(id),  -- pedido donde lo usó (NULL = sin usar)
  creado_en         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 6. VISTA: platos más pedidos
--    Una VISTA es una consulta guardada con nombre. Se usa como si fuera
--    una tabla: SELECT * FROM v_platos_mas_pedidos;
--    Suma las cantidades vendidas de cada plato (sin contar cancelados
--    ni los que fueron regalo). Así el ranking "escala" solo.
-- ---------------------------------------------------------------------
CREATE VIEW v_platos_mas_pedidos AS
SELECT  p.id,
        p.nombre,
        COALESCE(v.total, 0)::INT AS veces_pedido -- 0 si nunca se pidió (::INT = convertir a entero)
FROM    platos p
LEFT JOIN (
        -- subconsulta: total vendido por plato
        SELECT  d.plato_id, SUM(d.cantidad) AS total
        FROM    detalle_pedido d
        JOIN    pedidos pe ON pe.id = d.pedido_id
        WHERE   pe.estado <> 'cancelado'
          AND   d.es_regalo = FALSE
        GROUP BY d.plato_id
) v ON v.plato_id = p.id;
