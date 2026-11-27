// =====================================================================
//  cuentas.js — REGLAS DE OCUPACIÓN DE LAS MESAS
//  Una "cuenta abierta" = la mesa está OCUPADA.
//   · Al escanear el QR se abre la cuenta (la mesa se ocupa).
//   · Si en 15 minutos nadie pide nada, se cierra sola (mesa libre).
//   · Si ya pidió, queda ocupada hasta que el MESERO la libera.
//   · Quien escanea el QR de una mesa ya ocupada se UNE a esa cuenta
//     (es la misma mesa física: los amigos comparten la cuenta).
//  Lo usan mesas.controller (al escanear) y pedidos.controller (al pedir).
// =====================================================================
import pool from './db.js';

export const MINUTOS_SIN_PEDIDO = 15;

// Devuelve la cuenta abierta de la mesa; si no hay, la abre.
// "db" puede ser el pool o un cliente dentro de una transacción.
export async function obtenerOAbrirCuenta(db, mesaId, cuentaId, clienteId = null) {
  // 1. ¿La cuenta que recuerda el celular sigue abierta en ESTA mesa?
  if (cuentaId) {
    const r = await db.query(
      `SELECT id FROM cuentas WHERE id = $1 AND mesa_id = $2 AND estado = 'abierta'`,
      [cuentaId, mesaId]
    );
    if (r.rows.length > 0) return await asignarCliente(db, r.rows[0].id, clienteId);
  }

  // 2. ¿La mesa ya tiene una cuenta abierta? (un amigo ya escaneó) → nos unimos
  const abierta = await db.query(
    `SELECT id FROM cuentas WHERE mesa_id = $1 AND estado = 'abierta' ORDER BY id DESC LIMIT 1`,
    [mesaId]
  );
  if (abierta.rows.length > 0) return await asignarCliente(db, abierta.rows[0].id, clienteId);

  // 3. Mesa libre: abrimos una cuenta nueva (la mesa queda OCUPADA)
  try {
    const nueva = await db.query(
      'INSERT INTO cuentas (mesa_id, cliente_id) VALUES ($1, $2) RETURNING id',
      [mesaId, clienteId]
    );
    return { id: nueva.rows[0].id, nueva: true };
  } catch (error) {
    // 23505 = el índice único "una_cuenta_abierta_por_mesa" lo impidió:
    // otra persona abrió la cuenta de esta mesa en el mismo segundo. Usamos esa.
    if (error.code !== '23505' || db !== pool) throw error;
    const otra = await db.query(`SELECT id FROM cuentas WHERE mesa_id = $1 AND estado = 'abierta'`, [mesaId]);
    return await asignarCliente(db, otra.rows[0].id, clienteId);
  }
}

// Si un cliente registrado entra a la mesa, la cuenta pasa a ser suya (si no tenía dueño)
async function asignarCliente(db, cuentaId, clienteId) {
  if (clienteId) {
    await db.query('UPDATE cuentas SET cliente_id = COALESCE(cliente_id, $2) WHERE id = $1', [cuentaId, clienteId]);
  }
  return { id: cuentaId, nueva: false };
}

// Cierra las cuentas abiertas hace más de 15 minutos que NO tienen ningún pedido.
// Devuelve cuántas mesas quedaron libres.
export async function liberarMesasSinPedidos() {
  const { rowCount } = await pool.query(
    `UPDATE cuentas c
     SET    estado = 'cerrada', cerrada_en = NOW()
     WHERE  c.estado = 'abierta'
       AND  c.abierta_en < NOW() - make_interval(mins => $1)
       AND  NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cuenta_id = c.id)`,
    [MINUTOS_SIN_PEDIDO]
  );
  return rowCount;
}
