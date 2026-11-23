// =====================================================================
//  clientes.controller.js — CUENTAS DE CLIENTES (opcional)
//  El cliente puede pedir como INVITADO. Si se registra, gana:
//   · tarjetas guardadas (paga con un toque)
//   · cupón de 10% cuando su consumo supera S/100
//   · historial de sus pedidos
// =====================================================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Crea el token del cliente. "tipo: cliente" lo diferencia del personal.
function crearToken(cliente) {
  const datos = { id: cliente.id, nombre: cliente.nombre, tipo: 'cliente' };
  return { token: jwt.sign(datos, process.env.JWT_SECRET, { expiresIn: '30d' }), cliente: datos };
}

// ---------------------------------------------------------------------
// POST /api/clientes/registro   Body: { nombre, email, password }
// ---------------------------------------------------------------------
export async function registro(req, res) {
  const nombre = req.body.nombre?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;

  if (!nombre || nombre.length < 2) return res.status(400).json({ mensaje: 'Escribe tu nombre' });
  if (!EMAIL_VALIDO.test(email || '')) return res.status(400).json({ mensaje: 'Escribe un correo válido' });
  if (!password || password.length < 6) return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });

  try {
    const hash = await bcrypt.hash(password, 10);   // 10 = "rondas" de encriptado
    const { rows } = await pool.query(
      'INSERT INTO clientes (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING id, nombre',
      [nombre, email, hash]
    );
    res.status(201).json(crearToken(rows[0]));
  } catch (error) {
    // 23505 = código de PostgreSQL para "valor repetido" (el email es UNIQUE)
    if (error.code === '23505') return res.status(409).json({ mensaje: 'Ese correo ya está registrado. Inicia sesión.' });
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo crear la cuenta' });
  }
}

// ---------------------------------------------------------------------
// POST /api/clientes/login   Body: { email, password }
// ---------------------------------------------------------------------
export async function login(req, res) {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;
  if (!email || !password) return res.status(400).json({ mensaje: 'Ingresa tu correo y contraseña' });

  try {
    const { rows } = await pool.query('SELECT id, nombre, password_hash FROM clientes WHERE email = $1', [email]);
    const cliente = rows[0];
    const correcta = cliente && (await bcrypt.compare(password, cliente.password_hash));
    if (!correcta) return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    res.json(crearToken(cliente));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
}

// ---------------------------------------------------------------------
// GET /api/clientes/yo  → mis datos, tarjetas, cupones e historial
// ---------------------------------------------------------------------
export async function perfil(req, res) {
  const id = req.cliente.id;
  try {
    // 4 consultas en paralelo con Promise.all (más rápido que una por una)
    const [datos, metodos, cupones, pedidos] = await Promise.all([
      pool.query('SELECT id, nombre, email, creado_en FROM clientes WHERE id = $1', [id]),
      pool.query('SELECT id, tipo, marca, ultimos4 FROM metodos_pago WHERE cliente_id = $1 ORDER BY id DESC', [id]),
      pool.query(
        `SELECT cu.id, cu.porcentaje, pr.titulo
         FROM cupones cu JOIN promociones pr ON pr.id = cu.promocion_id
         WHERE cu.cliente_id = $1 AND cu.pedido_uso_id IS NULL
         ORDER BY cu.id`,
        [id]
      ),
      pool.query(
        `SELECT pe.id, pe.codigo, pe.estado, pe.total, pe.descuento, pe.creado_en, m.numero AS mesa
         FROM pedidos pe
         JOIN cuentas c ON c.id = pe.cuenta_id
         JOIN mesas m   ON m.id = c.mesa_id
         WHERE c.cliente_id = $1
         ORDER BY pe.id DESC LIMIT 10`,
        [id]
      ),
    ]);
    if (datos.rows.length === 0) return res.status(404).json({ mensaje: 'Cuenta no encontrada' });

    res.json({
      ...datos.rows[0],
      metodos: metodos.rows,
      cupones: cupones.rows,
      pedidos: pedidos.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al cargar tu cuenta' });
  }
}

// ---------------------------------------------------------------------
// POST /api/clientes/metodos   Body: { marca, ultimos4 }   → guardar tarjeta
// (SIMULADO: nunca guardamos el número completo, solo los últimos 4)
// ---------------------------------------------------------------------
export async function guardarTarjeta(req, res) {
  const { marca, ultimos4 } = req.body;
  if (!/^\d{4}$/.test(ultimos4 || '')) return res.status(400).json({ mensaje: 'Tarjeta no válida' });

  try {
    // Si ya la tenía guardada, no la duplicamos
    const existe = await pool.query(
      'SELECT id FROM metodos_pago WHERE cliente_id = $1 AND tipo = $2 AND ultimos4 = $3',
      [req.cliente.id, 'tarjeta', ultimos4]
    );
    if (existe.rows.length > 0) return res.json({ id: existe.rows[0].id });

    const { rows } = await pool.query(
      `INSERT INTO metodos_pago (cliente_id, tipo, marca, ultimos4)
       VALUES ($1, 'tarjeta', $2, $3) RETURNING id, tipo, marca, ultimos4`,
      [req.cliente.id, marca || 'Tarjeta', ultimos4]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo guardar la tarjeta' });
  }
}

// DELETE /api/clientes/metodos/:id  → borrar una tarjeta guardada (solo si es MÍA)
export async function borrarTarjeta(req, res) {
  try {
    const r = await pool.query(
      'DELETE FROM metodos_pago WHERE id = $1 AND cliente_id = $2',
      [Number(req.params.id), req.cliente.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ mensaje: 'Tarjeta no encontrada' });
    res.json({ mensaje: 'Tarjeta eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo eliminar la tarjeta' });
  }
}
