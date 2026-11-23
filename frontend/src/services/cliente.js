// =====================================================================
//  cliente.js — SESIÓN DEL CLIENTE REGISTRADO
//  Va en localStorage (y no en sessionStorage como el personal) porque
//  el cliente quiere seguir con su cuenta aunque cierre la pestaña.
// =====================================================================
export function guardarCliente({ token, cliente }) {
  try { localStorage.setItem('cliente', JSON.stringify({ token, cliente })); } catch { /* nada */ }
}

export function obtenerCliente() {
  try {
    return JSON.parse(localStorage.getItem('cliente'));   // { token, cliente } o null
  } catch {
    return null;
  }
}

export function cerrarCliente() {
  try { localStorage.removeItem('cliente'); } catch { /* nada */ }
}
