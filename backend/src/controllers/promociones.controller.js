// =====================================================================
//  promociones.controller.js — LÓGICA de las promociones
//  Alimenta el carrusel de la carta.
// =====================================================================
import pool from '../db.js';

// GET /api/promociones  → promociones activas y vigentes HOY
export async function listarPromociones(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT  pr.id, pr.titulo, pr.descripcion, pr.tipo,
              pr.precio_combo, pr.porcentaje, pr.monto_minimo, pr.solo_registrados,
              -- Foto para el carrusel:
              --   'regalo' → la foto del plato que activa la promo
              --   'combo'  → la foto del primer plato del combo (subconsulta)
              --   'descuento_siguiente' → no tiene plato, queda NULL
              COALESCE(
                p.imagen_url,
                (SELECT pl.imagen_url
                 FROM   combo_platos cp
                 JOIN   platos pl ON pl.id = cp.plato_id
                 WHERE  cp.promocion_id = pr.id
                 ORDER BY cp.plato_id
                 LIMIT 1)
              ) AS imagen_url
      FROM    promociones pr
      LEFT JOIN platos p ON p.id = pr.plato_id
      WHERE   pr.activa = TRUE
        AND   pr.inicio <= CURRENT_DATE
        AND  (pr.fin IS NULL OR pr.fin >= CURRENT_DATE)   -- NULL = sin fecha de fin
      ORDER BY pr.id
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener las promociones' });
  }
}
