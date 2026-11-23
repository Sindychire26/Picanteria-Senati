// =====================================================================
//  pedidos.controller.js — LÓGICA de los pedidos
//  Aquí es donde por fin se GUARDA información en la base de datos.
// =====================================================================
import pool from '../db.js';
import { avisarPedido } from '../socket.js';

const METODOS = ['yape', 'plin', 'tarjeta', 'efectivo'];

// Consulta reutilizable: trae pedidos con sus platos dentro.
// json_agg junta todas las filas de detalle_pedido en UNA lista JSON,
// así cada pedido viene con su arreglo "items" ya armado.
const SELECT_PEDIDOS = `
  SELECT  pe.id, pe.codigo, pe.estado, pe.subtotal, pe.descuento, pe.total,
          pe.creado_en, pe.cuenta_id, m.numero AS mesa,
          pa.metodo AS metodo_pago, pa.estado AS estado_pago,
          json_agg(
            json_build_object(
              'nombre', pl.nombre, 'cantidad', d.cantidad,
              'precio', d.precio_unitario, 'nota', d.nota, 'es_regalo', d.es_regalo
            ) ORDER BY d.id
          ) AS items
  FROM    pedidos pe
  JOIN    cuentas c        ON c.id = pe.cuenta_id
  JOIN    mesas m          ON m.id = c.mesa_id
  LEFT JOIN pagos pa       ON pa.pedido_id = pe.id
  JOIN    detalle_pedido d ON d.pedido_id = pe.id
  JOIN    platos pl        ON pl.id = d.plato_id
`;
const GROUP_PEDIDOS = `GROUP BY pe.id, m.numero, pa.metodo, pa.estado`;

// ---------------------------------------------------------------------
// POST /api/pedidos  → crea un pedido nuevo
// Body: { codigoMesa, cuentaId, metodoPago, cuponId?, items: [{ platoId, cantidad, nota }] }
// Si el cliente inició sesión, req.cliente viene del middleware identificarCliente
// ---------------------------------------------------------------------
export async function crearPedido(req, res) {
  const { codigoMesa, cuentaId, metodoPago, cuponId, items } = req.body;
  const clienteId = req.cliente?.id ?? null;   // null = invitado

  // 1. Validar lo que llega del celular (nunca confiar en el cliente)
  if (!codigoMesa) return res.status(400).json({ mensaje: 'Falta el código de la mesa' });
  if (!METODOS.includes(metodoPago)) return res.status(400).json({ mensaje: 'Método de pago no válido' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ mensaje: 'El carrito está vacío' });
  }
  for (const item of items) {
    if (!Number.isInteger(item.platoId) || !Number.isInteger(item.cantidad) ||
        item.cantidad < 1 || item.cantidad > 20) {
      return res.status(400).json({ mensaje: 'Hay un plato con cantidad no válida' });
    }
  }

  // 2. TRANSACCIÓN: usamos UNA conexión del pool para todo el proceso.
  //    BEGIN ... COMMIT  → se guarda todo junto
  //    ROLLBACK          → si algo falla, se deshace TODO (no queda nada a medias)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 2.1 Buscar la mesa
    const mesaRes = await client.query('SELECT id FROM mesas WHERE codigo = $1', [codigoMesa.toUpperCase()]);
    if (mesaRes.rows.length === 0) throw new ErrorCliente('Código de mesa no válido', 404);
    const mesaId = mesaRes.rows[0].id;

    // 2.2 Usar la cuenta abierta de esta mesa, o abrir una nueva
    let cuenta = null;
    if (cuentaId) {
      const r = await client.query(
        `SELECT id FROM cuentas WHERE id = $1 AND mesa_id = $2 AND estado = 'abierta'`,
        [cuentaId, mesaId]
      );
      cuenta = r.rows[0]?.id ?? null;
      // Si inició sesión a mitad de la visita, la cuenta pasa a ser suya
      if (cuenta && clienteId) {
        await client.query('UPDATE cuentas SET cliente_id = COALESCE(cliente_id, $2) WHERE id = $1', [cuenta, clienteId]);
      }
    }
    if (!cuenta) {
      const r = await client.query(
        'INSERT INTO cuentas (mesa_id, cliente_id) VALUES ($1, $2) RETURNING id',
        [mesaId, clienteId]
      );
      cuenta = r.rows[0].id;
    }

    // 2.3 Traer los PRECIOS REALES desde la base (no usamos el precio que manda el celular)
    const ids = items.map((i) => i.platoId);
    const platosRes = await client.query(
      'SELECT id, nombre, precio FROM platos WHERE id = ANY($1) AND disponible = TRUE',
      [ids]
    );
    const platos = new Map(platosRes.rows.map((p) => [p.id, p]));   // id → plato
    for (const item of items) {
      if (!platos.has(item.platoId)) throw new ErrorCliente('Un plato del carrito ya no está disponible', 409);
    }

    // 2.4 Calcular el total
    const subtotal = items.reduce((suma, i) => suma + platos.get(i.platoId).precio * i.cantidad, 0);
    // Cupón de descuento (solo clientes registrados y solo si es suyo y no está usado)
    // FOR UPDATE "bloquea" la fila: si manda 2 pedidos a la vez, no lo usa dos veces
    let descuento = 0;
    if (cuponId && clienteId) {
      const c = await client.query(
        `SELECT id, porcentaje FROM cupones
         WHERE id = $1 AND cliente_id = $2 AND pedido_uso_id IS NULL FOR UPDATE`,
        [cuponId, clienteId]
      );
      if (c.rows.length === 0) throw new ErrorCliente('El cupón ya no está disponible', 409);
      descuento = Math.round(subtotal * c.rows[0].porcentaje) / 100;   // redondeado a céntimos
    }
    const total = subtotal - descuento;

    // 2.5 Crear el pedido. Pedimos el siguiente número a la secuencia
    //     para armar un código corto y fácil de decir en caja: "A15"
    const { rows: [{ id: pedidoId }] } = await client.query(
      `SELECT nextval(pg_get_serial_sequence('pedidos', 'id'))::INT AS id`
    );
    const codigo = `A${pedidoId}`;
    // Online → ya está pagado y pasa a cocina. Efectivo → espera a caja.
    const estado = metodoPago === 'efectivo' ? 'pendiente_pago' : 'pagado';

    await client.query(
      `INSERT INTO pedidos (id, cuenta_id, codigo, estado, subtotal, descuento, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [pedidoId, cuenta, codigo, estado, subtotal, descuento, total]
    );

    if (descuento > 0) {
      await client.query('UPDATE cupones SET pedido_uso_id = $1 WHERE id = $2', [pedidoId, cuponId]);
    }

    // 2.6 Guardar cada plato del pedido
    for (const item of items) {
      await client.query(
        `INSERT INTO detalle_pedido (pedido_id, plato_id, cantidad, precio_unitario, nota)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedidoId, item.platoId, item.cantidad, platos.get(item.platoId).precio, item.nota?.trim() || null]
      );
    }

    // 2.7 Promos de REGALO: si pidió el plato de la promo, se agrega el regalo a S/ 0
    const promos = await client.query(
      `SELECT plato_id, plato_regalo_id FROM promociones
       WHERE tipo = 'regalo' AND activa = TRUE AND plato_id = ANY($1)
         AND inicio <= CURRENT_DATE AND (fin IS NULL OR fin >= CURRENT_DATE)`,
      [ids]
    );
    for (const promo of promos.rows) {
      const cantidad = items
        .filter((i) => i.platoId === promo.plato_id)
        .reduce((s, i) => s + i.cantidad, 0);
      await client.query(
        `INSERT INTO detalle_pedido (pedido_id, plato_id, cantidad, precio_unitario, nota, es_regalo)
         VALUES ($1, $2, $3, 0, 'Promoción', TRUE)`,
        [pedidoId, promo.plato_regalo_id, cantidad]
      );
    }

    // 2.8 Registrar el pago (SIMULADO)
    const online = metodoPago !== 'efectivo';
    await client.query(
      `INSERT INTO pagos (pedido_id, metodo, monto, estado, operacion)
       VALUES ($1, $2, $3, $4, $5)`,
      [pedidoId, metodoPago, total, online ? 'aprobado' : 'pendiente',
       online ? `SIM-${Date.now().toString().slice(-8)}` : null]
    );

    // 2.9 Promo "Vuelve y ahorra": si es cliente registrado y su consumo supera
    //     el monto mínimo, gana un cupón para su PRÓXIMO pedido
    let cuponGanado = null;
    if (clienteId) {
      const promo = await client.query(
        `SELECT id, porcentaje FROM promociones
         WHERE tipo = 'descuento_siguiente' AND activa = TRUE AND $1 >= monto_minimo
           AND inicio <= CURRENT_DATE AND (fin IS NULL OR fin >= CURRENT_DATE)
         LIMIT 1`,
        [subtotal]
      );
      if (promo.rows.length > 0) {
        const { id: promocionId, porcentaje } = promo.rows[0];
        await client.query(
          `INSERT INTO cupones (cliente_id, promocion_id, porcentaje, pedido_origen_id)
           VALUES ($1, $2, $3, $4)`,
          [clienteId, promocionId, porcentaje, pedidoId]
        );
        cuponGanado = porcentaje;
      }
    }

    await client.query('COMMIT');   // ✔ todo salió bien: se guarda

    // 3. Responder con el pedido completo
    const { rows } = await client.query(`${SELECT_PEDIDOS} WHERE pe.id = $1 ${GROUP_PEDIDOS}`, [pedidoId]);
    avisarPedido('pedido:nuevo', rows[0]);   // 📢 la cocina (o caja) se entera al instante
    res.status(201).json({ ...rows[0], cupon_ganado: cuponGanado });   // 201 = "creado"
  } catch (error) {
    await client.query('ROLLBACK');  // ✘ algo falló: se deshace todo
    if (error instanceof ErrorCliente) return res.status(error.status).json({ mensaje: error.message });
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo registrar el pedido' });
  } finally {
    client.release();                // devolvemos la conexión al pool (¡siempre!)
  }
}

// ---------------------------------------------------------------------
// GET /api/cuentas/:id/pedidos  → todos los pedidos de una cuenta (mesa)
// ---------------------------------------------------------------------
export async function pedidosDeCuenta(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ mensaje: 'Cuenta no válida' });
  try {
    const { rows } = await pool.query(
      `${SELECT_PEDIDOS} WHERE pe.cuenta_id = $1 ${GROUP_PEDIDOS} ORDER BY pe.id DESC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener los pedidos' });
  }
}

// ---------------------------------------------------------------------
// PATCH /api/pedidos/:id/cancelar  → el cliente cancela su pedido
// Solo se puede si la cocina TODAVÍA NO empezó a prepararlo.
// ---------------------------------------------------------------------
export async function cancelarPedido(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ mensaje: 'Pedido no válido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // El WHERE con estado hace la validación y el cambio en UN solo paso.
    // Si la cocina ya lo empezó, no se actualiza ninguna fila.
    const r = await client.query(
      `UPDATE pedidos SET estado = 'cancelado', actualizado_en = NOW()
       WHERE id = $1 AND estado IN ('pendiente_pago', 'pagado')
       RETURNING id, codigo, cuenta_id, estado`,
      [id]
    );
    if (r.rowCount === 0) {
      throw new ErrorCliente('Este pedido ya no se puede cancelar (la cocina ya empezó a prepararlo)', 409);
    }

    // Cupones: el que usó en este pedido vuelve a estar disponible,
    // y el que GANÓ con este pedido se anula (si todavía no lo usó)
    await client.query('UPDATE cupones SET pedido_uso_id = NULL WHERE pedido_uso_id = $1', [id]);
    await client.query('DELETE FROM cupones WHERE pedido_origen_id = $1 AND pedido_uso_id IS NULL', [id]);

    // Si ya estaba pagado online → reembolso (simulado). Si era efectivo, se anula.
    await client.query(
      `UPDATE pagos
       SET estado = CASE WHEN estado = 'aprobado' THEN 'reembolsado' ELSE estado END
       WHERE pedido_id = $1`,
      [id]
    );

    await client.query('COMMIT');
    avisarPedido('pedido:actualizado', r.rows[0]);   // 📢 la cocina lo quita de su pantalla
    res.json({ mensaje: 'Pedido cancelado' });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ErrorCliente) return res.status(error.status).json({ mensaje: error.message });
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo cancelar el pedido' });
  } finally {
    client.release();
  }
}

// Error "esperado" (culpa de los datos enviados), con su código HTTP
class ErrorCliente extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.status = status;
  }
}
