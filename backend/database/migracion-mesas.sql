-- =====================================================================
--  MIGRACIÓN: mesas ocupadas, fotos subidas y platos eliminados
--  Ejecutar UNA vez sobre la base que YA tienes (pgAdmin y Neon).
--  No borra nada: solo agrega lo nuevo. Se puede ejecutar dos veces
--  sin problema (IF NOT EXISTS).
-- =====================================================================

-- 1) Platos "eliminados": si un plato ya fue pedido, no se borra
--    (se rompería el historial de ventas); se marca como eliminado.
ALTER TABLE platos ADD COLUMN IF NOT EXISTS eliminado BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Fotos subidas desde el panel de admin.
--    Se guardan DENTRO de la base porque Render (plan gratis) borra los
--    archivos subidos cada vez que se reinicia. Cada foto pesa ~80 KB
--    porque el navegador la achica antes de subirla.
CREATE TABLE IF NOT EXISTS imagenes (
  id         SERIAL PRIMARY KEY,
  tipo       VARCHAR(30) NOT NULL,          -- image/jpeg, image/png, image/webp
  datos      BYTEA NOT NULL,                -- los bytes de la imagen
  creado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3) Una mesa solo puede tener UNA cuenta abierta a la vez.
--    Índice único "parcial": solo aplica a las filas con estado = 'abierta'.
--    (Primero cerramos duplicados que pudieran existir de pruebas anteriores)
UPDATE cuentas c SET estado = 'cerrada', cerrada_en = NOW()
WHERE  c.estado = 'abierta'
  AND  EXISTS (SELECT 1 FROM cuentas o
               WHERE o.mesa_id = c.mesa_id AND o.estado = 'abierta' AND o.id > c.id);
CREATE UNIQUE INDEX IF NOT EXISTS una_cuenta_abierta_por_mesa
  ON cuentas (mesa_id) WHERE estado = 'abierta';
