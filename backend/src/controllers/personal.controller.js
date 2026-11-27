// =====================================================================
//  personal.controller.js — PEDIDOS VISTOS POR EL PERSONAL
//  Cocina, mesero y caja usan las mismas rutas; lo que cambia es
//  QUÉ pedidos ven y QUÉ cambios de estado pueden hacer, según su rol.
// =====================================================================
import pool from '../db.js';
import { avisarPedido } from '../socket.js';

// Qué estados ve cada rol en su pantalla
const ESTADOS_POR_ROL = {
  cocina: ['pagado', 'en_preparacion', 'listo'],   // 'listo' solo para verlos en el mostrador
  mesero: ['listo'],
  caja:   ['pendiente_pago'],
  admin:  ['pendiente_pago', 'pagado', 'en_preparacion', 'listo'],
};

// Reglas del flujo: a qué estado se puede pasar, DESDE cuál y QUIÉN puede hacerlo
//   pendiente_pago ──caja──▶ pagado ──cocina──▶ en_preparacion ──cocina──▶ listo ──mesero──▶ entregado
const TRANSICIONES = {
  pagado:         { desde: 'pendiente_pago', roles: ['caja', 'admin'] },
  en_preparacion: { desde: 'pagado',         roles: ['cocina', 'admin'] },
  listo:          { desde: 'en_preparacion', roles: ['cocina', 'admin'] },
  entregado:      { desde: 'listo',          roles: ['mesero', 'admin'] },
};

// ---------------------------------------------------------------------
// GET /api/personal/pedidos  → pedidos que le tocan a mi rol
// ---------------------------------------------------------------------
export async function pedidosDelRol(req, res) {
  const estados = ESTADOS_POR_ROL[req.usuario.rol];
  try {
    const { rows } = await pool.query(
      `SELECT  pe.id, pe.codigo, pe.estado, pe.total, pe.creado_en, pe.cuenta_id,
               m.numero AS mesa, pa.metodo AS metodo_pago,
               -- minutos que lleva esperando (para que cocina vea qué urge)
               FLOOR(EXTRACT(EPOCH FROM (NOW() - pe.creado_en)) / 60)::INT AS minutos,
               json_agg(
                 json_build_object('nombre', pl.nombre || COALESCE(' (' || d.presentacion || ')', ''), 'cantidad', d.cantidad,
                                   'nota', d.nota, 'es_regalo', d.es_regalo)
                 ORDER BY d.id
               ) AS items
       FROM    pedidos pe
       JOIN    cuentas c        ON c.id = pe.cuenta_id
       JOIN    mesas m          ON m.id = c.mesa_id
       LEFT JOIN pagos pa       ON pa.pedido_id = pe.id
       JOIN    detalle_pedido d ON d.pedido_id = pe.id
       JOIN    platos pl        ON pl.id = d.plato_id
       WHERE   pe.estado = ANY($1)
       GROUP BY pe.id, m.numero, pa.metodo
       ORDER BY pe.creado_en ASC   -- el más antiguo primero (se atiende primero)
      `,
      [estados]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener los pedidos' });
  }
}

// ---------------------------------------------------------------------
// PATCH /api/personal/pedidos/:id/estado   Body: { estado }
// ---------------------------------------------------------------------
export async function cambiarEstado(req, res) {
  const id = Number(req.params.id);
  const { estado } = req.body;
  const regla = TRANSICIONES[estado];

  if (!Number.isInteger(id) || !regla) return res.status(400).json({ mensaje: 'Cambio de estado no válido' });
  if (!regla.roles.includes(req.usuario.rol)) {
    return res.status(403).json({ mensaje: 'Tu rol no puede hacer este cambio' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Solo se actualiza si el pedido está en el estado anterior correcto.
    // Si dos meseros tocan "Entregado" a la vez, solo el primero lo logra.
    // Si es "entregado", guardamos QUÉ mesero lo llevó; si no, dejamos el que estaba
    const meseroId = estado === 'entregado' ? req.usuario.id : null;
    const r = await client.query(
      `UPDATE pedidos
       SET estado = $1, actualizado_en = NOW(),
           mesero_id = COALESCE($3, mesero_id)
       WHERE id = $2 AND estado = $4
       RETURNING id, codigo, cuenta_id, estado`,
      [estado, id, meseroId, regla.desde]
    );
    if (r.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ mensaje: 'Este pedido ya cambió de estado. Actualiza la pantalla.' });
    }

    // Caja confirmó el efectivo → el pago queda aprobado y se registra el cajero
    if (estado === 'pagado') {
      await client.query(
        `UPDATE pagos SET estado = 'aprobado', cajero_id = $2 WHERE pedido_id = $1`,
        [id, req.usuario.id]
      );
    }

    await client.query('COMMIT');

    const pedido = r.rows[0];
    avisarPedido('pedido:actualizado', pedido);   // 📢 todas las pantallas se enteran
    res.json(pedido);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo cambiar el estado' });
  } finally {
    client.release();
  }
}
