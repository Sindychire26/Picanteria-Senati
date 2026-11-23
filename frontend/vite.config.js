// =====================================================================
//  vite.config.js — CONFIGURACIÓN DE VITE (el servidor de React)
// =====================================================================
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // permite abrir la app desde tu CELULAR (misma red WiFi)
    port: 5173,
    // PROXY: cuando React pida "/api/...", Vite se lo reenvía al backend.
    // Así en el código solo escribimos "/api/platos" (sin "localhost:3000")
    // y funciona igual desde la PC o desde el celular.
    proxy: {
      '/api': 'http://localhost:3000',
      '/imagenes': 'http://localhost:3000',   // las fotos también vienen del backend
      '/socket.io': { target: 'http://localhost:3000', ws: true },   // tiempo real (WebSocket)
    },
  },
});
