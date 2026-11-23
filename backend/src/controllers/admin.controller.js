// =====================================================================
//  admin.controller.js — PANEL DE ADMINISTRACIÓN
//  Solo el rol "admin" entra aquí (lo controla la ruta).
//   · resumen del día: ventas, pedidos, ticket promedio, métodos de pago
//   · movimientos: cada pago con quién cobró y quién entregó
//   · carta: activar/desactivar platos y cambiar precios
// =====================================================================
import pool from '../db.js';
import { avisarPedido } from '../socket.js';

// ---------------------------------------------------------------------
// GET /api/admin/resumen  → números de HOY
// ---------------------------------------------------------------------
export async function resumen(req, res) {
  try {
    const [totales, metodos, top, enCurso] = await Promise.all([
      // FILTER: cuenta solo las filas que cumplen la condición (muy útil para reportes)
      pool.query(`
        SELECT COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado = 'aprobado'), 0)    AS ventas,
               COUNT(*) FILTER (WHERE pe.estado <> 'cancelado')                      AS pedidos,
               COUNT(*) FILTER (WHERE pe.estado = 'cancelado')                       AS cancelados,
               COALESCE(SUM(pe.descuento) FILTER (WHERE pe.estado <> 'cancelado'), 0) AS descuentos
        FROM   pedidos pe
        LEFT JOIN pagos pa ON pa.pedido_id = pe.id
        WHERE  pe.creado_en::date = CURRENT_DATE
      `),
      pool.query(`
        SELECT pa.metodo, COUNT(*)::INT AS cantidad, SUM(pa.monto) AS total
        FROM   pagos pa JOIN pedidos pe ON pe.id = pa.pedido_id
        WHERE  pa.estado = 'aprobado' AND pe.creado_en::date = CURRENT_DATE
        GROUP BY pa.metodo
        ORDER BY total DESC
      `),
      pool.query(`
        SELECT pl.nombre, SUM(d.cantidad)::INT AS cantidad, SUM(d.cantidad * d.precio_unitario) AS total
        FROM   detalle_pedido d
        JOIN   pedidos pe ON pe.id = d.pedido_id
        JOIN   platos pl  ON pl.id = d.plato_id
        WHERE  pe.creado_en::date = CURRENT_DATE AND pe.estado <> 'cancelado' AND d.es_regalo = FALSE
        GROUP BY pl.nombre
        ORDER BY cantidad DESC, total DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT estado, COUNT(*)::INT AS cantidad FROM pedidos
        WHERE  estado IN ('pendiente_pago', 'pagado', 'en_preparacion', 'listo')
        GROUP BY estado
      `),
    ]);

    const t = totales.rows[0];
    const pedidos = Number(t.pedidos);
    res.json({
      ventas: t.ventas,
      pedidos,
      cancelados: Number(t.cancelados),
      descuentos: t.descuentos,
      ticketPromedio: pedidos > 0 ? t.ventas / pedidos : 0,
      metodos: metodos.rows,
      top: top.rows,
      enCurso: Object.fromEntries(enCurso.rows.map((r) => [r.estado, r.cantidad])),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al calcular el resumen' });
  }
}

// ---------------------------------------------------------------------
// GET /api/admin/movimientos  → últimos 50 pedidos con su pago y personal
// ---------------------------------------------------------------------
export async function movimientos(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT pe.id, pe.codigo, pe.estado, pe.total, pe.descuento, pe.creado_en,
             m.numero AS mesa,
             pa.metodo, pa.estado AS estado_pago, pa.operacion,
             caj.nombre AS cajero,
             mes.nombre AS mesero,
             COALESCE(cl.nombre, 'Invitado') AS cliente
      FROM   pedidos pe
      JOIN   cuentas c        ON c.id = pe.cuenta_id
      JOIN   mesas m          ON m.id = c.mesa_id
      LEFT JOIN pagos pa      ON pa.pedido_id = pe.id
      LEFT JOIN personal caj  ON caj.id = pa.cajero_id
      LEFT JOIN personal mes  ON mes.id = pe.mesero_id
      LEFT JOIN clientes cl   ON cl.id = c.cliente_id
      ORDER BY pe.id DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener los movimientos' });
  }
}

// ---------------------------------------------------------------------
// GET /api/admin/platos  → TODOS los platos (también los no disponibles)
// ---------------------------------------------------------------------
export async function platosAdmin(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.nombre, p.precio, p.disponible, p.imagen_url, c.nombre AS categoria, v.veces_pedido
      FROM   platos p
      JOIN   categorias c           ON c.id = p.categoria_id
      JOIN   v_platos_mas_pedidos v ON v.id = p.id
      ORDER BY c.orden, p.nombre
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener los platos' });
  }
}

// ---------------------------------------------------------------------
// PATCH /api/admin/platos/:id   Body: { disponible?, precio? }
// ---------------------------------------------------------------------
export async function actualizarPlato(req, res) {
  const id = Number(req.params.id);
  const { disponible, precio } = req.body;

  if (disponible !== undefined && typeof disponible !== 'boolean') {
    return res.status(400).json({ mensaje: 'Valor de disponible no válido' });
  }
  if (precio !== undefined && !(Number(precio) > 0 && Number(precio) < 10000)) {
    return res.status(400).json({ mensaje: 'Precio no válido' });
  }

  try {
    // COALESCE: si no mandan un campo (null), se queda el valor que tenía
    const { rows } = await pool.query(
      `UPDATE platos
       SET disponible = COALESCE($2, disponible),
           precio     = COALESCE($3, precio)
       WHERE id = $1
       RETURNING id, nombre, precio, disponible`,
      [id, disponible ?? null, precio !== undefined ? Number(precio) : null]
    );
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Plato no encontrado' });

    avisarPedido('carta:actualizada', rows[0]);   // 📢 las cartas abiertas se actualizan solas
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo actualizar el plato' });
  }
}
