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
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.precio_grande, p.nombre_chico, p.nombre_grande,
             p.picante, p.disponible, p.imagen_url, p.categoria_id, c.nombre AS categoria, v.veces_pedido
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

const vacio = (v) => v === undefined || v === null || v === '';

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
  // Tamaño grande: opcional. Si viene precio grande, los dos tamaños necesitan nombre.
  if (!vacio(d.precio_grande)) {
    if (!(Number(d.precio_grande) > 0 && Number(d.precio_grande) < 10000)) return 'Precio del tamaño grande no válido';
    if (vacio(d.nombre_chico) || vacio(d.nombre_grande)) return 'Ponle nombre a los dos tamaños (ej: Vaso y Jarra)';
    if (String(d.nombre_chico).length > 20 || String(d.nombre_grande).length > 20) return 'El nombre del tamaño es muy largo';
  }
  if (d.picante !== undefined && ![0, 1, 2].includes(d.picante)) return 'Nivel de picante no válido';
  if (d.disponible !== undefined && typeof d.disponible !== 'boolean') return 'Valor de disponible no válido';
  if (d.imagen_url && !/^\/(api\/fotos|imagenes)\//.test(d.imagen_url)) return 'Foto no válida';
  return null;
}

// Los 3 datos del tamaño grande, listos para la base: si no hay precio grande, todo null
function tamanos(d) {
  if (vacio(d.precio_grande)) return [null, null, null];
  return [Number(d.precio_grande), String(d.nombre_chico).trim(), String(d.nombre_grande).trim()];
}

// ---------------------------------------------------------------------
// POST /api/admin/platos  → plato NUEVO
// Body: { nombre, descripcion, categoria_id, precio, picante?, imagen_url?, disponible?,
//         precio_grande?, nombre_chico?, nombre_grande? }
// ---------------------------------------------------------------------
export async function crearPlato(req, res) {
  const error = validarPlato(req.body, false);
  if (error) return res.status(400).json({ mensaje: error });

  const { nombre, descripcion, categoria_id, precio, picante, imagen_url, disponible } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO platos (nombre, descripcion, categoria_id, precio, precio_grande, nombre_chico, nombre_grande,
                          picante, imagen_url, disponible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, nombre, precio, disponible`,
      [nombre.trim(), descripcion?.trim() || null, Number(categoria_id), Number(precio),
       ...tamanos(req.body), picante ?? 0, imagen_url || null, disponible ?? true]
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
// Body: los mismos campos que al crear, todos opcionales
// ---------------------------------------------------------------------
export async function actualizarPlato(req, res) {
  const id = Number(req.params.id);
  const error = validarPlato(req.body, true);
  if (error) return res.status(400).json({ mensaje: error });

  const { nombre, descripcion, categoria_id, precio, picante, imagen_url, disponible } = req.body;
  try {
    // COALESCE: si no mandan un campo (null), se queda el valor que tenía.
    // Los tamaños son distintos: SÍ se pueden borrar (volver a un solo precio),
    // por eso $9 dice si vinieron o no ("precio_grande" en el body).
    const { rows } = await pool.query(
      `UPDATE platos
       SET nombre        = COALESCE($2, nombre),
           descripcion   = COALESCE($3, descripcion),
           categoria_id  = COALESCE($4, categoria_id),
           precio        = COALESCE($5, precio),
           imagen_url    = COALESCE($6, imagen_url),
           disponible    = COALESCE($7, disponible),
           picante       = COALESCE($8, picante),
           precio_grande = CASE WHEN $9 THEN $10::NUMERIC ELSE precio_grande END,
           nombre_chico  = CASE WHEN $9 THEN $11 ELSE nombre_chico END,
           nombre_grande = CASE WHEN $9 THEN $12 ELSE nombre_grande END
       WHERE id = $1 AND eliminado = FALSE
       RETURNING id, nombre, precio, disponible`,
      [id, nombre?.trim() ?? null, descripcion?.trim() ?? null,
       categoria_id !== undefined ? Number(categoria_id) : null,
       precio !== undefined ? Number(precio) : null, imagen_url ?? null, disponible ?? null,
       picante ?? null, 'precio_grande' in req.body, ...tamanos(req.body)]
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

// =====================================================================
//  CATEGORÍAS DE LA CARTA (Entradas, Bebidas, Platos no picantes...)
// =====================================================================

// GET /api/admin/categorias  → con cuántos platos tiene cada una
export async function categoriasAdmin(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.nombre, c.orden,
             COUNT(p.id) FILTER (WHERE p.eliminado = FALSE)::INT AS platos,
             COUNT(p.id)::INT AS platos_totales          -- incluye los ocultos (con ventas)
      FROM   categorias c
      LEFT JOIN platos p ON p.categoria_id = c.id
      GROUP BY c.id
      ORDER BY c.orden, c.id
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener las categorías' });
  }
}

const nombreValido = (n) => typeof n === 'string' && n.trim().length >= 3 && n.trim().length <= 50;

// POST /api/admin/categorias  Body: { nombre }  → queda al final
export async function crearCategoria(req, res) {
  if (!nombreValido(req.body.nombre)) return res.status(400).json({ mensaje: 'El nombre debe tener entre 3 y 50 letras' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO categorias (nombre, orden)
       VALUES ($1, (SELECT COALESCE(MAX(orden), 0) + 1 FROM categorias))
       RETURNING id, nombre, orden`,
      [req.body.nombre.trim()]
    );
    avisarPedido('carta:actualizada', {});
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ mensaje: 'Ya existe una categoría con ese nombre' });
    console.error(e);
    res.status(500).json({ mensaje: 'No se pudo crear la categoría' });
  }
}

// PATCH /api/admin/categorias/:id  Body: { nombre }  → renombrar
export async function renombrarCategoria(req, res) {
  if (!nombreValido(req.body.nombre)) return res.status(400).json({ mensaje: 'El nombre debe tener entre 3 y 50 letras' });
  try {
    const r = await pool.query('UPDATE categorias SET nombre = $2 WHERE id = $1 RETURNING id',
      [Number(req.params.id), req.body.nombre.trim()]);
    if (r.rowCount === 0) return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    avisarPedido('carta:actualizada', {});
    res.json({ mensaje: 'Categoría renombrada' });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ mensaje: 'Ya existe una categoría con ese nombre' });
    console.error(e);
    res.status(500).json({ mensaje: 'No se pudo renombrar' });
  }
}

// POST /api/admin/categorias/:id/mover  Body: { direccion: 'arriba' | 'abajo' }
// Intercambia el "orden" con la categoría vecina (en una transacción)
export async function moverCategoria(req, res) {
  const id = Number(req.params.id);
  const arriba = req.body.direccion === 'arriba';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Primero dejamos los órdenes como 1, 2, 3... sin repetidos
    await client.query(`
      UPDATE categorias c SET orden = n.fila
      FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY orden, id) AS fila FROM categorias) n
      WHERE c.id = n.id`);
    const { rows: [actual] } = await client.query('SELECT orden FROM categorias WHERE id = $1', [id]);
    if (!actual) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    }
    const vecino = actual.orden + (arriba ? -1 : 1);
    await client.query('UPDATE categorias SET orden = $1 WHERE orden = $2', [actual.orden, vecino]);
    await client.query('UPDATE categorias SET orden = $1 WHERE id = $2 AND $1 > 0 AND $1 <= (SELECT COUNT(*) FROM categorias)', [vecino, id]);
    await client.query('COMMIT');
    avisarPedido('carta:actualizada', {});
    res.json({ mensaje: 'Orden cambiado' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ mensaje: 'No se pudo mover' });
  } finally {
    client.release();
  }
}

// DELETE /api/admin/categorias/:id  → solo si no tiene ningún plato
export async function eliminarCategoria(req, res) {
  const id = Number(req.params.id);
  try {
    const { rows: [c] } = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE eliminado = FALSE)::INT AS visibles, COUNT(*)::INT AS todos
       FROM platos WHERE categoria_id = $1`, [id]);
    if (c.visibles > 0) {
      return res.status(409).json({ mensaje: `Tiene ${c.visibles} ${c.visibles === 1 ? 'plato' : 'platos'}: muévelos a otra categoría primero` });
    }
    if (c.todos > 0) {
      return res.status(409).json({ mensaje: 'Tiene platos antiguos con ventas guardadas: no se puede borrar, pero sí renombrar' });
    }
    const r = await pool.query('DELETE FROM categorias WHERE id = $1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    avisarPedido('carta:actualizada', {});
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'No se pudo eliminar' });
  }
}
