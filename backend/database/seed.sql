-- =====================================================================
--  DATOS DE PRUEBA (seed = "semilla")
--  Llena la base con la carta, las mesas y algunas promociones.
--  Ejecutar DESPUÉS de schema.sql
-- =====================================================================

-- Categorías ---------------------------------------------------------
INSERT INTO categorias (nombre, orden) VALUES
  ('Entradas', 1),
  ('Caldos y chupes', 2),
  ('Platos picantes', 3),
  ('Bebidas', 4),
  ('Postres', 5);

-- Platos: carta de picantería arequipeña ---------------------------
-- imagen_url = ruta de la foto dentro de backend/public/imagenes/platos/
-- (categoria_id: 1=Entradas, 2=Caldos, 3=Picantes, 4=Bebidas, 5=Postres)
INSERT INTO platos (categoria_id, nombre, descripcion, precio, imagen_url) VALUES
  -- id 1-4: Entradas
  (1, 'Soltero de queso',        'Ensalada fresca de queso, habas, choclo, cebolla, tomate y rocoto', 18.00, '/imagenes/platos/soltero-de-queso.jpg'),
  (1, 'Ocopa arequipeña',        'Papas bañadas en crema de huacatay, ají mirasol y maní',           16.00, '/imagenes/platos/ocopa-arequipena.jpg'),
  (1, 'Escribano',               'Papa y tomate picados con rocoto, vinagre y aceite',              12.00, '/imagenes/platos/escribano.jpg'),
  (1, 'Sarza de patita',         'Patita de cerdo con cebolla, habas y rocoto',                     18.00, '/imagenes/platos/sarza-de-patita.jpg'),
  -- id 5-8: Caldos y chupes
  (2, 'Chupe de camarones',      'El rey de la picantería: camarones de río, leche, huevo y queso', 55.00, '/imagenes/platos/chupe-de-camarones.jpg'),
  (2, 'Adobo arequipeño',        'Cerdo macerado en chicha de guiñapo y especias, con pan de tres puntas', 30.00, '/imagenes/platos/adobo-arequipeno.jpg'),
  (2, 'Chairo',                  'Caldo contundente de carne, chuño y verduras',                    22.00, '/imagenes/platos/chairo.jpg'),
  (2, 'Chaque',                  'Caldo de carne con papa, chuño, mote y verduras',                 22.00, '/imagenes/platos/chaque.jpg'),
  -- id 9-14: Platos picantes
  (3, 'Rocoto relleno con pastel de papa', 'Rocoto relleno de carne, queso y huevo, con pastel de papa gratinado', 32.00, '/imagenes/platos/rocoto-relleno.jpg'),
  (3, 'Cuy chactado',            'Cuy frito bajo piedra con papas sancochadas y ensalada',           60.00, '/imagenes/platos/cuy-chactado.jpg'),
  (3, 'Costillar frito',         'Costillar de cerdo dorado con papas y ensalada',                   38.00, '/imagenes/platos/costillar-frito.jpg'),
  (3, 'Malaya frita',            'Malaya de res frita, crocante, con papas y ensalada',              38.00, '/imagenes/platos/malaya-frita.jpg'),
  (3, 'Americano',               'Plato combinado para compartir: rocoto relleno, cuy, costillar, ocopa y más', 70.00, '/imagenes/platos/americano.jpg'),
  (3, 'Locro de pecho',          'Guiso de pecho de res con papa amarilla, zapallo y queso',         25.00, '/imagenes/platos/locro-de-pecho.jpg'),
  -- id 15-18: Bebidas
  (4, 'Chicha de guiñapo (jarra)','Chicha de maíz morado germinado, tradicional de Arequipa, 1 litro', 15.00, '/imagenes/platos/chicha-de-guinapo.jpg'),
  (4, 'Chicha morada (jarra)',   'Jarra de 1 litro',                                                 12.00, '/imagenes/platos/chicha-morada.jpg'),
  (4, 'Kola Escocesa 500 ml',    'La gaseosa arequipeña de siempre',                                  5.00, '/imagenes/platos/kola-escocesa.jpg'),
  (4, 'Limonada',                'Vaso de 500 ml',                                                   10.00, '/imagenes/platos/limonada.jpg'),
  -- id 19-20: Postres
  (5, 'Queso helado',            'El helado arequipeño con canela',                                   8.00, '/imagenes/platos/queso-helado.jpg'),
  (5, 'Buñuelos con miel',       'Buñuelos caseros con miel de chancaca',                            10.00, '/imagenes/platos/bunuelos.jpg');

-- Mesas (el código es lo que irá dentro del QR) ---------------------
INSERT INTO mesas (numero, codigo) VALUES
  (1,'M01-A7K2'), (2,'M02-B3X9'), (3,'M03-C8P4'), (4,'M04-D2M6'), (5,'M05-E9R1'),
  (6,'M06-F4T7'), (7,'M07-G6W3'), (8,'M08-H1Z5'), (9,'M09-J5N8'), (10,'M10-K3Q2');

-- Promociones -------------------------------------------------------
-- 1) Consume más de S/100 y gana 10% de descuento en tu próximo pedido
INSERT INTO promociones (titulo, descripcion, tipo, monto_minimo, porcentaje, solo_registrados)
VALUES ('Vuelve y ahorra', 'Por consumos mayores a S/100 ganas 10% en tu siguiente pedido',
        'descuento_siguiente', 100.00, 10.00, TRUE);

-- 2) Americano + jarra de chicha de guiñapo gratis  (plato 13 = Americano, 15 = Chicha de guiñapo)
INSERT INTO promociones (titulo, descripcion, tipo, plato_id, plato_regalo_id)
VALUES ('Americano con chicha', 'Pide un Americano y llévate una jarra de chicha de guiñapo gratis',
        'regalo', 13, 15);

-- 3) Combo arequipeño: Rocoto relleno + Chupe de camarones + Chicha de guiñapo a S/85 (normal S/102)
INSERT INTO promociones (titulo, descripcion, tipo, precio_combo)
VALUES ('Combo mistiano', 'Rocoto relleno + Chupe de camarones + Chicha de guiñapo', 'combo', 85.00);

INSERT INTO combo_platos (promocion_id, plato_id, cantidad) VALUES
  (3, 9, 1),   -- Rocoto relleno
  (3, 5, 1),   -- Chupe de camarones
  (3, 15, 1);  -- Chicha de guiñapo

-- Pedidos de ejemplo (ya entregados) para que "Lo más pedido" tenga datos
INSERT INTO cuentas (mesa_id, estado, cerrada_en) VALUES
  (1, 'cerrada', NOW()), (2, 'cerrada', NOW()), (3, 'cerrada', NOW());

INSERT INTO pedidos (cuenta_id, codigo, estado, subtotal, total) VALUES
  (1, 'D001', 'entregado', 119.00, 119.00),
  (2, 'D002', 'entregado',  97.00,  97.00),
  (3, 'D003', 'entregado', 110.00, 110.00);

INSERT INTO detalle_pedido (pedido_id, plato_id, cantidad, precio_unitario) VALUES
  (1, 9, 2, 32.00), (1, 5, 1, 55.00),                      -- 2 rocotos + chupe        = 119
  (2, 9, 1, 32.00), (2, 6, 2, 30.00), (2, 17, 1, 5.00),    -- rocoto + 2 adobos + kola = 97
  (3, 13, 1, 70.00), (3, 9, 1, 32.00), (3, 19, 1, 8.00);   -- americano + rocoto + queso helado = 110

INSERT INTO pagos (pedido_id, metodo, monto, estado, operacion) VALUES
  (1, 'yape',     119.00, 'aprobado', 'SIM-000001'),
  (2, 'tarjeta',   97.00, 'aprobado', 'SIM-000002'),
  (3, 'efectivo', 110.00, 'aprobado', NULL);
