-- =====================================================================
--  USUARIOS DEL PERSONAL (de prueba)
--  Todos tienen la contraseña: 1234
--  Lo que se guarda NO es "1234": es su HASH hecho con bcrypt.
--  Aunque alguien robe la base de datos, no puede saber la contraseña.
-- =====================================================================
DELETE FROM personal WHERE usuario IN ('cocina', 'mesero1', 'mesero2', 'caja', 'admin');

INSERT INTO personal (nombre, usuario, password_hash, rol) VALUES
  ('Doña Rosa (cocina)', 'cocina',  '$2b$10$Rrw1kYUQ8im7.IdB/1wz..Zqb1xvU3veeQ3WlZ3mPxnWPd8.BoTxa', 'cocina'),
  ('Carlos (mesero)',    'mesero1', '$2b$10$Rrw1kYUQ8im7.IdB/1wz..Zqb1xvU3veeQ3WlZ3mPxnWPd8.BoTxa', 'mesero'),
  ('Lucía (mesera)',     'mesero2', '$2b$10$Rrw1kYUQ8im7.IdB/1wz..Zqb1xvU3veeQ3WlZ3mPxnWPd8.BoTxa', 'mesero'),
  ('Jorge (caja)',       'caja',    '$2b$10$Rrw1kYUQ8im7.IdB/1wz..Zqb1xvU3veeQ3WlZ3mPxnWPd8.BoTxa', 'caja'),
  ('Administrador',      'admin',   '$2b$10$Rrw1kYUQ8im7.IdB/1wz..Zqb1xvU3veeQ3WlZ3mPxnWPd8.BoTxa', 'admin');
