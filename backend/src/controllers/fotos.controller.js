// =====================================================================
//  fotos.controller.js — FOTOS SUBIDAS DESDE LA GALERÍA (admin)
//  ¿Por qué en la base de datos y no en una carpeta?
//  Render (plan gratis) borra los archivos subidos cada vez que se
//  reinicia. En la base (Neon) quedan guardadas para siempre.
//  El navegador achica la foto antes de subirla (~80 KB), así no pesa.
// =====================================================================
import pool from '../db.js';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 1.5 * 1024 * 1024;   // 1.5 MB como máximo

// POST /api/admin/fotos   Body: { imagen: "data:image/jpeg;base64,...." }
export async function subirFoto(req, res) {
  // Una "data URL" trae el tipo y los bytes en texto base64
  const partes = /^data:(image\/[a-z]+);base64,(.+)$/.exec(req.body.imagen || '');
  if (!partes || !TIPOS.includes(partes[1])) {
    return res.status(400).json({ mensaje: 'Formato de imagen no válido (usa JPG, PNG o WEBP)' });
  }
  const bytes = Buffer.from(partes[2], 'base64');
  if (bytes.length > MAX_BYTES) {
    return res.status(413).json({ mensaje: 'La foto es muy pesada (máximo 1.5 MB)' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO imagenes (tipo, datos) VALUES ($1, $2) RETURNING id',
      [partes[1], bytes]
    );
    // Esta es la "dirección" de la foto: se guarda en platos.imagen_url
    res.status(201).json({ url: `/api/fotos/${rows[0].id}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo guardar la foto' });
  }
}

// GET /api/fotos/:id  → devuelve la imagen (la usan las etiquetas <img>)
export async function servirFoto(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).end();
  try {
    const { rows } = await pool.query('SELECT tipo, datos FROM imagenes WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).end();
    res.set('Content-Type', rows[0].tipo);
    // Una foto nunca cambia (si cambias la foto, se crea otra con otro id):
    // el navegador la puede guardar en caché por un año
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(rows[0].datos);
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
}
