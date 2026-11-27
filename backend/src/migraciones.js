// =====================================================================
//  migraciones.js — ACTUALIZA LA BASE DE DATOS SOLA AL ARRANCAR
//  Cuando el proyecto crece, la base necesita columnas o tablas nuevas.
//  En vez de pedirte que ejecutes el .sql a mano en pgAdmin y en Neon,
//  el servidor lo ejecuta cada vez que arranca.
//  Es seguro repetirlo: el .sql usa "IF NOT EXISTS" (si ya existe, no
//  hace nada) y NO borra datos.
// =====================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pool from './db.js';

const ARCHIVOS = ['migracion-mesas.sql'];

export async function actualizarBaseDeDatos() {
  for (const archivo of ARCHIVOS) {
    const ruta = fileURLToPath(new URL(`../database/${archivo}`, import.meta.url));
    await pool.query(readFileSync(ruta, 'utf8'));
    console.log(`🗄️  Base de datos al día (${archivo})`);
  }
}
