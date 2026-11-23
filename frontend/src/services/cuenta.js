// =====================================================================
//  cuenta.js — RECORDAR LA "CUENTA" DE LA MESA
//  Cuando el cliente hace su primer pedido, el backend abre una cuenta.
//  Guardamos su id en el celular para que los siguientes pedidos
//  (el heladito de después) caigan en la MISMA cuenta.
// =====================================================================
const clave = (codigoMesa) => `cuenta-${codigoMesa.toUpperCase()}`;

export function obtenerCuenta(codigoMesa) {
  try {
    return Number(localStorage.getItem(clave(codigoMesa))) || null;
  } catch {
    return null;
  }
}

export function guardarCuenta(codigoMesa, cuentaId) {
  try {
    localStorage.setItem(clave(codigoMesa), String(cuentaId));
  } catch { /* si no se puede guardar, igual funciona */ }
}
