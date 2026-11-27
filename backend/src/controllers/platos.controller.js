// =====================================================================
//  platos.controller.js — LÓGICA de la carta
//  Cada función recibe la petición (req), consulta la base de datos
//  y responde (res) con JSON.
// =====================================================================
import pool from '../db.js';

// GET /api/categorias  → lista de categorías en orden
export async function listarCategorias(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre FROM categorias ORDER BY orden'
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener las categorías' });
  }
}

// GET /api/platos  → toda la carta disponible, con su categoría
// JOIN = unir dos tablas usando la llave foránea (platos.categoria_id → categorias.id)
export async function listarPlatos(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT  p.id, p.nombre, p.descripcion, p.precio, p.precio_grande, p.nombre_chico, p.nombre_grande,
              p.picante, p.imagen_url,
              c.id     AS categoria_id,
              c.nombre AS categoria,
              v.veces_pedido
      FROM    platos p
      JOIN    categorias c           ON c.id = p.categoria_id
      JOIN    v_platos_mas_pedidos v ON v.id = p.id
      WHERE   p.disponible = TRUE
      ORDER BY c.orden, p.nombre
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener los platos' });
  }
}

// GET /api/platos/mas-pedidos?limite=5  → ranking de los más pedidos
export async function platosMasPedidos(req, res) {
  // Leemos el límite de la URL; si no viene usamos 5. Máximo 20.
  const limite = Math.min(Number(req.query.limite) || 5, 20);
  try {
    // $1 es un PARÁMETRO: pg reemplaza el valor de forma segura.
    // Nunca se pegan valores directo en el SQL (eso permite "SQL injection").
    const { rows } = await pool.query(
      `SELECT  v.id, v.nombre, v.veces_pedido, p.precio, p.precio_grande, p.nombre_chico, p.nombre_grande,
               p.picante, p.imagen_url
       FROM    v_platos_mas_pedidos v
       JOIN    platos p ON p.id = v.id
       WHERE   p.disponible = TRUE AND v.veces_pedido > 0
       ORDER BY v.veces_pedido DESC
       LIMIT   $1`,
      [limite]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener los más pedidos' });
  }
}

// GET /api/platos/:id  → un solo plato
export async function obtenerPlato(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ mensaje: 'El id debe ser un número' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS categoria
       FROM platos p JOIN categorias c ON c.id = p.categoria_id
       WHERE p.id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Plato no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener el plato' });
  }
}
