// =====================================================================
//  api.js — TODAS LAS LLAMADAS AL BACKEND EN UN SOLO LUGAR
//  Los componentes NO usan fetch directamente: llaman a estas funciones.
//  Si mañana cambia una URL, solo se cambia aquí.
// =====================================================================
import { obtenerSesion, cerrarSesion } from './sesion.js';
import { obtenerCliente, cerrarCliente } from './cliente.js';

// Función base: hace la petición y convierte la respuesta a JSON.
// Si el backend responde con error (404, 500...), lanza una excepción
// con el mensaje que mandó el servidor.
async function pedir(url, opciones = {}) {
  // ¿Qué token mandamos? Las rutas del personal y del admin usan el del PERSONAL;
  // todas las demás, el del CLIENTE (si inició sesión). Las rutas públicas lo ignoran.
  const esPersonal = url.startsWith('/personal') || url.startsWith('/admin');
  const token = esPersonal ? obtenerSesion()?.token : obtenerCliente()?.token;
  const respuesta = await fetch(`/api${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...opciones,
  });
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) {                 // token vencido: cerramos sesión
      if (esPersonal) cerrarSesion(); else cerrarCliente();
    }
    throw new Error(datos?.mensaje || 'Error de conexión con el servidor');
  }
  return datos;
}

// --- Carta ---
export const obtenerCategorias = () => pedir('/categorias');
export const obtenerPlatos = () => pedir('/platos');
export const obtenerMasPedidos = (limite = 5) => pedir(`/platos/mas-pedidos?limite=${limite}`);

// --- Promociones ---
export const obtenerPromociones = () => pedir('/promociones');

// --- Pedidos ---
export const crearPedido = (datos) =>
  pedir('/pedidos', { method: 'POST', body: JSON.stringify(datos) });
export const obtenerPedidosDeCuenta = (cuentaId) => pedir(`/cuentas/${cuentaId}/pedidos`);
export const cancelarPedido = (pedidoId) =>
  pedir(`/pedidos/${pedidoId}/cancelar`, { method: 'PATCH' });

// --- Asistente con IA ---
export const preguntarAsistente = (mensajes) =>
  pedir('/chat', { method: 'POST', body: JSON.stringify({ mensajes }) });

// --- Mesas ---
export const obtenerMesas = () => pedir('/mesas');
export const obtenerMesa = (codigo) => pedir(`/mesas/${codigo}`);

// --- Personal (requieren haber iniciado sesión) ---
export const iniciarSesion = (usuario, password) =>
  pedir('/auth/login', { method: 'POST', body: JSON.stringify({ usuario, password }) });
export const obtenerPedidosPersonal = () => pedir('/personal/pedidos');
export const cambiarEstadoPedido = (pedidoId, estado) =>
  pedir(`/personal/pedidos/${pedidoId}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) });

// --- Clientes registrados ---
export const registrarCliente = (datos) =>
  pedir('/clientes/registro', { method: 'POST', body: JSON.stringify(datos) });
export const ingresarCliente = (datos) =>
  pedir('/clientes/login', { method: 'POST', body: JSON.stringify(datos) });
export const obtenerMiCuenta = () => pedir('/clientes/yo');
export const guardarTarjeta = (marca, ultimos4) =>
  pedir('/clientes/metodos', { method: 'POST', body: JSON.stringify({ marca, ultimos4 }) });
export const borrarTarjeta = (id) => pedir(`/clientes/metodos/${id}`, { method: 'DELETE' });

// --- Administración (solo admin) ---
export const obtenerResumen = () => pedir('/admin/resumen');
export const obtenerMovimientos = () => pedir('/admin/movimientos');
export const obtenerPlatosAdmin = () => pedir('/admin/platos');
export const actualizarPlato = (id, cambios) =>
  pedir(`/admin/platos/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) });
