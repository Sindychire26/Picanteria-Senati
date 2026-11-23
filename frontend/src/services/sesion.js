// =====================================================================
//  sesion.js — GUARDAR LA SESIÓN DEL PERSONAL
//  Usamos sessionStorage (y no localStorage) porque es INDEPENDIENTE
//  en cada pestaña: así en una pestaña puedes ser cocina y en otra
//  mesero sin que se pisen. Al cerrar la pestaña, la sesión se cierra.
// =====================================================================
export function guardarSesion({ token, usuario }) {
  try {
    sessionStorage.setItem('sesion', JSON.stringify({ token, usuario }));
  } catch { /* sin almacenamiento: la sesión dura hasta recargar */ }
}

export function obtenerSesion() {
  try {
    return JSON.parse(sessionStorage.getItem('sesion'));   // { token, usuario } o null
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  try { sessionStorage.removeItem('sesion'); } catch { /* nada */ }
}
