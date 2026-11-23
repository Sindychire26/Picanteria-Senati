// =====================================================================
//  chat.controller.js — ASISTENTE CON INTELIGENCIA ARTIFICIAL (Groq)
//  1. Lee la carta REAL de la base de datos (solo platos disponibles)
//  2. Se la da a la IA como "contexto" con reglas de cómo responder
//  3. La IA responde en JSON: { respuesta, platos: [ids recomendados] }
//  4. Validamos esos ids contra la base y devolvemos los platos completos
//     → así React puede mostrar el botón "Agregar al carrito"
//  La API KEY vive SOLO aquí, en el backend (.env). Nunca en React.
// =====================================================================
import pool from '../db.js';

const URL_GROQ = process.env.GROQ_URL || 'https://api.groq.com/openai/v1/chat/completions';
const MAX_MENSAJES = 10;     // solo mandamos los últimos 10 mensajes (ahorra tokens)
const MAX_LARGO = 500;       // cada mensaje se corta a 500 caracteres

// ---------------------------------------------------------------------
// Arma las instrucciones para la IA con la carta y promociones de HOY
// ---------------------------------------------------------------------
async function armarContexto() {
  const { rows: platos } = await pool.query(`
    SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen_url, c.nombre AS categoria, v.veces_pedido
    FROM   platos p
    JOIN   categorias c           ON c.id = p.categoria_id
    JOIN   v_platos_mas_pedidos v ON v.id = p.id
    WHERE  p.disponible = TRUE
    ORDER BY c.orden, p.nombre
  `);
  const { rows: promos } = await pool.query(`
    SELECT titulo, descripcion FROM promociones
    WHERE  activa = TRUE AND inicio <= CURRENT_DATE AND (fin IS NULL OR fin >= CURRENT_DATE)
  `);

  // La carta en texto, una línea por plato: la IA solo conoce lo que está aquí
  const carta = platos
    .map((p) => `- id ${p.id} | ${p.nombre} | ${p.categoria} | S/ ${p.precio.toFixed(2)} | ${p.descripcion} | pedido ${p.veces_pedido} veces`)
    .join('\n');
  const listaPromos = promos.map((p) => `- ${p.titulo}: ${p.descripcion}`).join('\n') || '- (ninguna hoy)';

  const instrucciones = `Eres "Misti", el asistente virtual de la ${process.env.NOMBRE_RESTAURANTE || 'picantería'}, una picantería tradicional de Arequipa (Perú).
Hablas en español, con calidez y un toque arequipeño, pero siempre respetuoso. Respondes CORTO: máximo 3 oraciones.

CARTA DISPONIBLE HOY (solo puedes recomendar estos platos):
${carta}

PROMOCIONES VIGENTES:
${listaPromos}

REGLAS:
1. Recomienda SOLO platos de la carta de arriba. Nunca inventes platos, precios ni promociones.
2. Si piden "lo más pedido" o "lo más popular", usa el dato "pedido N veces".
3. Si preguntan por alergias o ingredientes que no están en la descripción, di que confirmen con el mesero.
4. Si preguntan algo que no tiene que ver con el restaurante, responde amablemente que solo puedes ayudar con la carta.
5. Recomienda como máximo 3 platos por respuesta.

FORMATO: responde SOLO con un objeto JSON válido, sin texto extra, así:
{"respuesta": "tu mensaje para el cliente", "platos": [ids de los platos que recomiendas, o [] si ninguno]}`;

  return { instrucciones, platos };
}

// ---------------------------------------------------------------------
// POST /api/chat   Body: { mensajes: [{ rol: 'usuario' | 'asistente', texto }] }
// ---------------------------------------------------------------------
export async function conversar(req, res) {
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ mensaje: 'El asistente no está configurado (falta GROQ_API_KEY en el .env)' });
  }

  const { mensajes } = req.body;
  if (!Array.isArray(mensajes) || mensajes.length === 0) {
    return res.status(400).json({ mensaje: 'Escribe una pregunta' });
  }

  try {
    const { instrucciones, platos } = await armarContexto();

    // Convertimos nuestro formato al que entiende la IA (estilo OpenAI)
    const historial = mensajes.slice(-MAX_MENSAJES).map((m) => ({
      role: m.rol === 'asistente' ? 'assistant' : 'user',
      content: String(m.texto || '').slice(0, MAX_LARGO),
    }));

    const modelo = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const respuestaIA = await fetch(URL_GROQ, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelo,
        messages: [{ role: 'system', content: instrucciones }, ...historial],
        temperature: 0.6,                              // un poco creativo, pero no tanto
        max_tokens: 800,
        response_format: { type: 'json_object' },      // obliga a responder en JSON
        ...(modelo.startsWith('openai/gpt-oss') && { reasoning_effort: 'low' }),  // más rápido
      }),
    });

    if (!respuestaIA.ok) {
      const detalle = await respuestaIA.text();
      console.error('Groq respondió con error:', respuestaIA.status, detalle);
      const mensaje = respuestaIA.status === 429
        ? 'Misti está atendiendo muchas preguntas, intenta en unos segundos'
        : 'Misti no pudo responder ahora, intenta otra vez';
      return res.status(502).json({ mensaje });
    }

    const datos = await respuestaIA.json();
    const contenido = datos.choices?.[0]?.message?.content || '';

    // Leemos el JSON que mandó la IA. Si vino mal, usamos el texto tal cual.
    let respuesta = contenido;
    let ids = [];
    try {
      const json = JSON.parse(contenido);
      respuesta = json.respuesta || '';
      ids = Array.isArray(json.platos) ? json.platos.map(Number) : [];
    } catch { /* no era JSON: mostramos el texto */ }

    // Solo devolvemos platos que EXISTEN y están disponibles (por si la IA se equivoca)
    const recomendados = ids
      .map((id) => platos.find((p) => p.id === id))
      .filter(Boolean)
      .slice(0, 3);

    res.json({
      respuesta: respuesta || 'Disculpa, no entendí bien. ¿Me lo dices de otra forma?',
      platos: recomendados.map(({ id, nombre, precio, imagen_url }) => ({ id, nombre, precio, imagen_url })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el asistente' });
  }
}
