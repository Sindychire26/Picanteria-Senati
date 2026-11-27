-- =====================================================================
--  migracion-tamanos.sql — TAMAÑOS Y PICANTE
--  · Tamaños: un plato puede venderse en dos tamaños, cada uno con su
--    nombre y su precio. Ej: Vaso S/ 4 / Jarra S/ 12, o Personal S/ 3 / 1 litro S/ 7.
--      precio        → precio del tamaño chico (o el único precio)
--      precio_grande → precio del tamaño grande (vacío = un solo tamaño)
--      nombre_chico / nombre_grande → cómo se llama cada tamaño
--  · picante: 0 = no pica, 1 = pica poco, 2 = picante
--  · detalle_pedido.presentacion: el nombre del tamaño que eligió el
--    cliente, guardado tal cual (como el precio_unitario: si mañana
--    cambias "Jarra" por "Jarra 1 L", los pedidos viejos no cambian).
--  No borra datos. El servidor lo ejecuta solo al arrancar (migraciones.js).
-- =====================================================================
ALTER TABLE platos ADD COLUMN IF NOT EXISTS precio_grande NUMERIC(8,2) CHECK (precio_grande > 0);
ALTER TABLE platos ADD COLUMN IF NOT EXISTS nombre_chico  VARCHAR(20);
ALTER TABLE platos ADD COLUMN IF NOT EXISTS nombre_grande VARCHAR(20);
ALTER TABLE platos ADD COLUMN IF NOT EXISTS picante SMALLINT NOT NULL DEFAULT 0 CHECK (picante BETWEEN 0 AND 2);

-- Si tu base tenía la versión anterior ("precio_jarra"), se pasa a la nueva
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'platos' AND column_name = 'precio_jarra') THEN
    UPDATE platos SET precio_grande = precio_jarra, nombre_chico = 'Vaso', nombre_grande = 'Jarra'
    WHERE precio_jarra IS NOT NULL;
    ALTER TABLE platos DROP COLUMN precio_jarra;
  END IF;
END $$;

-- El tamaño elegido se guarda con su nombre (texto libre, ya no solo vaso/jarra)
ALTER TABLE detalle_pedido ADD COLUMN IF NOT EXISTS presentacion VARCHAR(20);
ALTER TABLE detalle_pedido DROP CONSTRAINT IF EXISTS detalle_pedido_presentacion_check;
ALTER TABLE detalle_pedido ALTER COLUMN presentacion TYPE VARCHAR(20);
UPDATE detalle_pedido SET presentacion = INITCAP(presentacion) WHERE presentacion IN ('vaso', 'jarra');
