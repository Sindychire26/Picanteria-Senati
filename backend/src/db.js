// =====================================================================
//  db.js — CONEXIÓN A POSTGRESQL
//  Aquí se crea UNA sola conexión ("pool") que usa todo el backend.
// =====================================================================
import pg from 'pg';
import 'dotenv/config';            // lee el archivo .env y lo pone en process.env

// Un "Pool" es un grupo de conexiones reutilizables.
// Así no abrimos y cerramos una conexión en cada consulta (sería lento).
//
// Dos formas de configurarlo:
//  · EN INTERNET (Render + Neon): una sola variable DATABASE_URL
//    ej: postgresql://usuario:clave@servidor.neon.tech/neondb?sslmode=require
//  · EN TU PC: las variables DB_HOST, DB_USER, DB_PASSWORD... del .env
const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : new pg.Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

// PostgreSQL devuelve los NUMERIC (precios) como texto ("38.00") para no
// perder precisión. Le decimos que los convierta a número de JavaScript.
pg.types.setTypeParser(1700, (valor) => parseFloat(valor));

export default pool;
