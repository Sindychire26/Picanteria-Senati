// =====================================================================
//  auth.js — MIDDLEWARES DE SEGURIDAD
//  Un middleware es una función que se ejecuta ANTES del controlador.
//  Si algo está mal, corta la petición; si todo está bien, llama next().
// =====================================================================
import jwt from 'jsonwebtoken';

// 1. ¿Viene un token válido?  (Header → Authorization: Bearer <token>)
export function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;
  if (!token) return res.status(401).json({ mensaje: 'Debes iniciar sesión' });

  try {
    // jwt.verify comprueba la FIRMA: si alguien cambió el token, falla
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);   // { id, nombre, rol }
    next();
  } catch {
    res.status(401).json({ mensaje: 'Tu sesión expiró, vuelve a iniciar sesión' });
  }
}

// 2. ¿Su rol tiene permiso?  Uso: permitirRoles('cocina', 'admin')
export function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tienes permiso para esto' });
    }
    next();
  };
}

// 3. CLIENTES registrados (obligatorio): para "Mi cuenta", tarjetas guardadas...
export function verificarCliente(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    if (datos.tipo !== 'cliente') throw new Error();
    req.cliente = datos;                       // { id, nombre, tipo: 'cliente' }
    next();
  } catch {
    res.status(401).json({ mensaje: 'Inicia sesión con tu cuenta de cliente' });
  }
}

// 4. CLIENTES (opcional): si viene un token de cliente válido lo usamos,
//    si no, seguimos igual como INVITADO. Lo usa la ruta de crear pedido.
export function identificarCliente(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    if (datos.tipo === 'cliente') req.cliente = datos;
  } catch { /* sin token o token inválido: invitado */ }
  next();
}
