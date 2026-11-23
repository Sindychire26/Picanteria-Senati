// =====================================================================
//  socket.js — TIEMPO REAL CON SOCKET.IO
//  Normalmente el navegador PREGUNTA y el servidor RESPONDE.
//  Con Socket.IO la conexión queda abierta y el SERVIDOR puede AVISAR
//  al navegador apenas pasa algo ("¡llegó un pedido nuevo!").
// =====================================================================
import { Server } from 'socket.io';

let io = null;

// Se llama una sola vez desde server.js
export function iniciarSocket(servidorHttp) {
  io = new Server(servidorHttp, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    console.log('🔌 Pantalla conectada:', socket.id);
  });
}

// Avisa a TODAS las pantallas conectadas que un pedido cambió.
// Cada pantalla decide si le interesa (la cocina, el mesero, el cliente...).
export function avisarPedido(evento, datos) {
  io?.emit(evento, datos);
}
