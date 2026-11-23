// =====================================================================
//  mesas.controller.js — LÓGICA de las mesas
//  Cuando el cliente escanea el QR, React llama a /api/mesas/:codigo
//  para saber qué mesa es (y confirmar que el código existe).
// =====================================================================
import pool from '../db.js';

// GET /api/mesas  → lista de mesas (la usamos en la pantalla "demo")
export async function listarMesas(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT id, numero, codigo FROM mesas ORDER BY numero'
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener las mesas' });
  }
}

// GET /api/mesas/:codigo  → busca la mesa por el código del QR
export async function obtenerMesaPorCodigo(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT id, numero, codigo FROM mesas WHERE codigo = $1',
      [req.params.codigo.toUpperCase()]
    );
    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Código de mesa no válido' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al buscar la mesa' });
  }
}
