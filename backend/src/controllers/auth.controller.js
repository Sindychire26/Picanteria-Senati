// =====================================================================
//  auth.controller.js — INICIO DE SESIÓN DEL PERSONAL
// =====================================================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

// POST /api/auth/login   Body: { usuario, password }
export async function login(req, res) {
  const { usuario, password } = req.body;
  if (!usuario || !password) {
    return res.status(400).json({ mensaje: 'Ingresa usuario y contraseña' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, usuario, password_hash, rol FROM personal WHERE usuario = $1 AND activo = TRUE',
      [usuario.trim().toLowerCase()]
    );
    const persona = rows[0];

    // bcrypt.compare: aplica el hash a la contraseña escrita y lo compara con el guardado
    const correcta = persona && (await bcrypt.compare(password, persona.password_hash));
    if (!correcta) {
      // Mismo mensaje para usuario o contraseña incorrectos: no damos pistas
      return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
    }

    // El TOKEN es como una "pulsera de acceso" firmada que dura 12 horas.
    // Dentro lleva quién eres y tu rol; el servidor puede verificar que no fue alterado.
    const datos = { id: persona.id, nombre: persona.nombre, rol: persona.rol };
    const token = jwt.sign(datos, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.json({ token, usuario: datos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
}
