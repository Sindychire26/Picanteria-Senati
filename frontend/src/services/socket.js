// =====================================================================
//  socket.js — CONEXIÓN EN TIEMPO REAL CON EL BACKEND
//  Una sola conexión para toda la app. Las páginas la usan así:
//    socket.on('pedido:nuevo', () => ...)      escuchar
//    socket.off('pedido:nuevo', funcion)        dejar de escuchar
// =====================================================================
import { io } from 'socket.io-client';

// Sin URL: se conecta al mismo servidor de la página (Vite lo reenvía al backend)
export const socket = io();
