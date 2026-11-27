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
// GET /api/admin/platos  → TODOS los platos (también los no disponibles),
// menos los eliminados
// ---------------------------------------------------------------------
export async function platosAdmin(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.disponible, p.imagen_url,
             p.categoria_id, c.nombre AS categoria, v.veces_pedido
      FROM   platos p
      JOIN   categorias c           ON c.id = p.categoria_id
      JOIN   v_platos_mas_pedidos v ON v.id = p.id
      WHERE  p.eliminado = FALSE
      ORDER BY c.orden, p.nombre
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener los platos' });
  }
}

// Revisa los datos de un plato. "parcial" = al editar, los campos pueden faltar.
// Devuelve el mensaje de error, o null si todo está bien.
function validarPlato(d, parcial) {
  const falta = (campo) => d[campo] === undefined && !parcial;
  if (falta('nombre') || (d.nombre !== undefined && !(String(d.nombre).trim().length >= 3))) {
    return 'El nombre debe tener al menos 3 letras';
  }
  if (falta('categoria_id') || (d.categoria_id !== undefined && !Number.isInteger(Number(d.categoria_id)))) {
    return 'Elige una categoría';
  }
  if (falta('precio') || (d.precio !== undefined && !(Number(d.precio) > 0 && Number(d.precio) < 10000))) {
    return 'Precio no válido';
  }
  if (d.disponible !== undefined && typeof d.disponible !== 'boolean') return 'Valor de disponible no válido';
  if (d.imagen_url && !/^\/(api\/fotos|imagenes)\//.test(d.imagen_url)) return 'Foto no válida';
  return null;
}

// ---------------------------------------------------------------------
// POST /api/admin/platos  → plato NUEVO
// Body: { nombre, descripcion, categoria_id, precio, imagen_url?, disponible? }
// ---------------------------------------------------------------------
export async function crearPlato(req, res) {
  const error = validarPlato(req.body, false);
  if (error) return res.status(400).json({ mensaje: error });

  const { nombre, descripcion, categoria_id, precio, imagen_url, disponible } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO platos (nombre, descripcion, categoria_id, precio, imagen_url, disponible)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, precio, disponible`,
      [nombre.trim(), descripcion?.trim() || null, Number(categoria_id), Number(precio),
       imagen_url || null, disponible ?? true]
    );
    avisarPedido('carta:actualizada', rows[0]);   // 📢 aparece en las cartas abiertas
    res.status(201).json(rows[0]);
  } catch (e) {
    // 23503 = la categoría no existe (llave foránea)
    if (e.code === '23503') return res.status(400).json({ mensaje: 'Esa categoría no existe' });
    console.error(e);
    res.status(500).json({ mensaje: 'No se pudo crear el plato' });
  }
}

// ---------------------------------------------------------------------
// PATCH /api/admin/platos/:id  → editar (solo los campos que vengan)
// Body: { nombre?, descripcion?, categoria_id?, precio?, imagen_url?, disponible? }
// ---------------------------------------------------------------------
export async function actualizarPlato(req, res) {
  const id = Number(req.params.id);
  const error = validarPlato(req.body, true);
  if (error) return res.status(400).json({ mensaje: error });

  const { nombre, descripcion, categoria_id, precio, imagen_url, disponible } = req.body;
  try {
    // COALESCE: si no mandan un campo (null), se queda el valor que tenía
    const { rows } = await pool.query(
      `UPDATE platos
       SET nombre       = COALESCE($2, nombre),
           descripcion  = COALESCE($3, descripcion),
           categoria_id = COALESCE($4, categoria_id),
           precio       = COALESCE($5, precio),
           imagen_url   = COALESCE($6, imagen_url),
           disponible   = COALESCE($7, disponible)
       WHERE id = $1 AND eliminado = FALSE
       RETURNING id, nombre, precio, disponible`,
      [id, nombre?.trim() ?? null, descripcion?.trim() ?? null,
       categoria_id !== undefined ? Number(categoria_id) : null,
       precio !== undefined ? Number(precio) : null, imagen_url ?? null, disponible ?? null]
    );
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Plato no encontrado' });

    avisarPedido('carta:actualizada', rows[0]);   // 📢 las cartas abiertas se actualizan solas
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23503') return res.status(400).json({ mensaje: 'Esa categoría no existe' });
    console.error(e);
    res.status(500).json({ mensaje: 'No se pudo actualizar el plato' });
  }
}

// ---------------------------------------------------------------------
// DELETE /api/admin/platos/:id
// · Si NUNCA fue pedido ni está en una promo → se BORRA de verdad.
// · Si ya fue pedido o está en una promo → NO se borra (rompería el
//   historial de ventas: las llaves foráneas lo impiden). Se OCULTA:
//   eliminado = true y disponible = false. Deja de verse en la carta
//   y en el admin, pero las ventas pasadas siguen intactas.
// ---------------------------------------------------------------------
export async function eliminarPlato(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ mensaje: 'Plato no válido' });

  try {
    // ¿Alguna tabla apunta a este plato?
    const { rows: [{ usado }] } = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM detalle_pedido WHERE plato_id = $1)
          OR EXISTS (SELECT 1 FROM promociones WHERE plato_id = $1 OR plato_regalo_id = $1)
          OR EXISTS (SELECT 1 FROM combo_platos WHERE plato_id = $1) AS usado
    `, [id]);

    const r = usado
      ? await pool.query('UPDATE platos SET eliminado = TRUE, disponible = FALSE WHERE id = $1 AND eliminado = FALSE RETURNING id', [id])
      : await pool.query('DELETE FROM platos WHERE id = $1 RETURNING id', [id]);
    if (r.rowCount === 0) return res.status(404).json({ mensaje: 'Plato no encontrado' });

    avisarPedido('carta:actualizada', { id });   // 📢 desaparece de las cartas abiertas
    res.json(usado
      ? { modo: 'ocultado', mensaje: 'El plato ya tenía pedidos: se ocultó para no perder el historial de ventas' }
      : { modo: 'borrado', mensaje: 'Plato eliminado' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'No se pudo eliminar el plato' });
  }
}
