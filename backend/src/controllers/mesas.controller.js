// =====================================================================
//  mesas.controller.js — LÓGICA de las mesas
//  · Público: lista de mesas libres/ocupadas, buscar por QR, ocupar al escanear
//  · Personal: detalle de cada mesa y LIBERAR (mesero o admin)
//  · Admin: agregar mesas nuevas
// =====================================================================
import pool from '../db.js';
import { avisar } from '../socket.js';
import { obtenerOAbrirCuenta, liberarMesasSinPedidos, MINUTOS_SIN_PEDIDO } from '../cuentas.js';

// GET /api/mesas  → todas las mesas con su estado (libre / ocupada)
export async function listarMesas(req, res) {
  try {
    await liberarMesasSinPedidos();          // primero cerramos las que vencieron
    const { rows } = await pool.query(`
      SELECT m.id, m.numero, m.codigo,
             EXISTS (SELECT 1 FROM cuentas c WHERE c.mesa_id = m.id AND c.estado = 'abierta') AS ocupada
      FROM   mesas m
      ORDER BY m.numero
    `);
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

// POST /api/mesas/:codigo/ocupar   Body: { cuentaId? }
// Se llama cuando el cliente abre la carta (escaneó el QR): la mesa queda ocupada.
export async function ocuparMesa(req, res) {
  try {
    const mesa = await pool.query('SELECT id FROM mesas WHERE codigo = $1', [req.params.codigo.toUpperCase()]);
    if (mesa.rows.length === 0) return res.status(404).json({ mensaje: 'Código de mesa no válido' });

    await liberarMesasSinPedidos();
    const cuenta = await obtenerOAbrirCuenta(pool, mesa.rows[0].id, Number(req.body.cuentaId) || null, req.cliente?.id);
    if (cuenta.nueva) avisar('mesas:actualizadas', { mesaId: mesa.rows[0].id });   // 📢 se ocupó una mesa
    res.json({ cuentaId: cuenta.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo abrir la mesa' });
  }
}

// ---------------------------------------------------------------------
// GET /api/personal/mesas  → detalle de cada mesa (mesero, caja, admin)
// ---------------------------------------------------------------------
export async function detalleMesas(req, res) {
  try {
    await liberarMesasSinPedidos();
    const { rows } = await pool.query(`
      SELECT m.id, m.numero, m.codigo,
             c.id AS cuenta_id, c.abierta_en,
             FLOOR(EXTRACT(EPOCH FROM (NOW() - c.abierta_en)) / 60)::INT AS minutos,
             cl.nombre AS cliente,
             COUNT(pe.id)::INT                                                       AS pedidos_totales,
             COUNT(pe.id) FILTER (WHERE pe.estado <> 'cancelado')::INT               AS pedidos,
             COALESCE(SUM(pe.total) FILTER (WHERE pe.estado <> 'cancelado'), 0)      AS consumo,
             COUNT(pe.id) FILTER (WHERE pe.estado = 'pendiente_pago')::INT           AS por_cobrar,
             COUNT(pe.id) FILTER (WHERE pe.estado = 'pagado')::INT                   AS en_cola,
             COUNT(pe.id) FILTER (WHERE pe.estado = 'en_preparacion')::INT           AS cocinando,
             COUNT(pe.id) FILTER (WHERE pe.estado = 'listo')::INT                    AS para_llevar,
             COUNT(pe.id) FILTER (WHERE pe.estado = 'entregado')::INT                AS entregados
      FROM   mesas m
      LEFT JOIN cuentas c   ON c.mesa_id = m.id AND c.estado = 'abierta'
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      LEFT JOIN pedidos pe  ON pe.cuenta_id = c.id
      GROUP BY m.id, c.id, cl.nombre
      ORDER BY m.numero
    `);

    res.json(rows.map((m) => {
      const pendientes = m.por_cobrar + m.en_cola + m.cocinando + m.para_llevar;
      return {
        ...m,
        ocupada: m.cuenta_id !== null,
        pendientes,
        puede_liberar: m.cuenta_id !== null && pendientes === 0,
        // Si todavía no pidió nada, en cuántos minutos se libera sola
        libre_en: m.cuenta_id !== null && m.pedidos_totales === 0
          ? Math.max(MINUTOS_SIN_PEDIDO - m.minutos, 0)
          : null,
      };
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener las mesas' });
  }
}

// ---------------------------------------------------------------------
// PATCH /api/personal/mesas/:id/liberar  → el mesero deja la mesa libre
// No se puede si tiene pedidos sin terminar (por cobrar, en cocina, por llevar).
// ---------------------------------------------------------------------
export async function liberarMesa(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ mensaje: 'Mesa no válida' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cuenta = await client.query(
      `SELECT id FROM cuentas WHERE mesa_id = $1 AND estado = 'abierta' FOR UPDATE`,
      [id]
    );
    if (cuenta.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ mensaje: 'La mesa ya está libre' });
    }

    const { rows: [{ pendientes }] } = await client.query(
      `SELECT COUNT(*)::INT AS pendientes FROM pedidos
       WHERE cuenta_id = $1 AND estado IN ('pendiente_pago', 'pagado', 'en_preparacion', 'listo')`,
      [cuenta.rows[0].id]
    );
    if (pendientes > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        mensaje: `No se puede liberar: tiene ${pendientes} ${pendientes === 1 ? 'pedido' : 'pedidos'} sin terminar (por cobrar, en cocina o por llevar)`,
      });
    }

    await client.query(
      `UPDATE cuentas SET estado = 'cerrada', cerrada_en = NOW() WHERE id = $1`,
      [cuenta.rows[0].id]
    );
    await client.query('COMMIT');

    avisar('mesas:actualizadas', { mesaId: id });   // 📢 la mesa aparece libre en todas las pantallas
    res.json({ mensaje: 'Mesa liberada' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo liberar la mesa' });
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------
// POST /api/admin/mesas  → agrega la siguiente mesa con su código de QR
// ---------------------------------------------------------------------
export async function agregarMesa(req, res) {
  try {
    const { rows: [{ siguiente }] } = await pool.query(
      'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM mesas'
    );
    // Código del QR: M + número con 2 dígitos + 4 letras/números al azar (ej: M11-X7K2)
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin O/0 ni I/1 para que no se confundan
    const azar = Array.from({ length: 4 }, () => letras.charAt(Math.floor(Math.random() * letras.length))).join('');
    const codigo = `M${String(siguiente).padStart(2, '0')}-${azar}`;

    const { rows } = await pool.query(
      'INSERT INTO mesas (numero, codigo) VALUES ($1, $2) RETURNING id, numero, codigo',
      [siguiente, codigo]
    );
    avisar('mesas:actualizadas', { mesaId: rows[0].id });
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo agregar la mesa' });
  }
}
