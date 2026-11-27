// =====================================================================
//  server.js — PUNTO DE ENTRADA DEL BACKEND
//  Crea el servidor Express, registra las rutas y lo pone a escuchar.
// =====================================================================
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import 'dotenv/config';
import pool from './db.js';
import platosRoutes from './routes/platos.routes.js';
import mesasRoutes from './routes/mesas.routes.js';
import promocionesRoutes from './routes/promociones.routes.js';
import pedidosRoutes from './routes/pedidos.routes.js';
import authRoutes from './routes/auth.routes.js';
import personalRoutes from './routes/personal.routes.js';
import chatRoutes from './routes/chat.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { iniciarSocket, avisar } from './socket.js';
import { liberarMesasSinPedidos } from './cuentas.js';
import { actualizarBaseDeDatos } from './migraciones.js';
import fotosRoutes from './routes/fotos.routes.js';

const app = express();

// --- Middlewares (se ejecutan en CADA petición, antes de las rutas) ---
app.use(cors());          // permite que React (otro puerto) llame a esta API
app.use(express.json({ limit: '3mb' }));  // body JSON → objeto (3 MB: alcanza para una foto achicada)

// --- Archivos estáticos (fotos) ---
// Todo lo que está en backend/public/imagenes se puede ver en el navegador.
// Ej: backend/public/imagenes/platos/rocoto-relleno.jpg
//     →  http://localhost:3000/imagenes/platos/rocoto-relleno.jpg
const carpetaImagenes = fileURLToPath(new URL('../public/imagenes', import.meta.url));
app.use('/imagenes', express.static(carpetaImagenes));

// --- Rutas ---
app.get('/api/salud', async (req, res) => {
  // Ruta de prueba: confirma que el servidor Y la base de datos responden
  try {
    const { rows } = await pool.query('SELECT NOW() AS hora');
    res.json({ ok: true, baseDeDatos: 'conectada', hora: rows[0].hora });
  } catch (error) {
    res.status(500).json({ ok: false, baseDeDatos: 'sin conexión', error: error.message });
  }
});

app.use('/api', platosRoutes);   // todas las rutas de platos empiezan con /api
app.use('/api', mesasRoutes);
app.use('/api', promocionesRoutes);
app.use('/api', pedidosRoutes);
app.use('/api', authRoutes);
app.use('/api', personalRoutes);
app.use('/api', chatRoutes);
app.use('/api', clientesRoutes);
app.use('/api', adminRoutes);
app.use('/api', fotosRoutes);

// --- Frontend ya compilado (solo cuando está publicado en internet) ---
// En tu PC, React corre aparte con Vite (puerto 5173).
// En Render, hacemos "npm run build" y Express sirve la carpeta frontend/dist,
// así TODO (página + API + tiempo real) vive en una sola dirección.
const carpetaFrontend = fileURLToPath(new URL('../../frontend/dist', import.meta.url));
if (existsSync(carpetaFrontend)) {
  app.use(express.static(carpetaFrontend));
  // Cualquier otra ruta (ej: /mesa/M05-E9R1) devuelve index.html y React Router se encarga
  app.get(/^(?!\/api|\/socket\.io|\/imagenes).*/, (req, res) => {
    res.sendFile('index.html', { root: carpetaFrontend });
  });
}

// --- Encender el servidor ---
// Express y Socket.IO comparten el MISMO servidor HTTP (y el mismo puerto)
const servidor = createServer(app);
iniciarSocket(servidor);

const PORT = process.env.PORT || 3000;
// Cada minuto: las mesas ocupadas hace 15 min sin ningún pedido se liberan solas
setInterval(async () => {
  try {
    const liberadas = await liberarMesasSinPedidos();
    if (liberadas > 0) avisar('mesas:actualizadas');
  } catch (error) {
    console.error('Error liberando mesas:', error.message);
  }
}, 60 * 1000);

// Primero ponemos la base al día (columnas y tablas nuevas) y LUEGO arrancamos.
// Si falla, igual arrancamos y avisamos en la terminal.
try {
  await actualizarBaseDeDatos();
} catch (error) {
  console.error('No se pudo actualizar la base de datos:', error.message);
}

servidor.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
