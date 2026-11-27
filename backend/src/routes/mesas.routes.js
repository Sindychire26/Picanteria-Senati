// =====================================================================
//  mesas.routes.js — RUTAS de las mesas
//  Públicas (cliente), del personal (mesero/caja/admin) y del admin
// =====================================================================
import { Router } from 'express';
import { verificarToken, permitirRoles, identificarCliente } from '../middlewares/auth.js';
import {
  listarMesas, obtenerMesaPorCodigo, ocuparMesa, detalleMesas, liberarMesa, agregarMesa,
} from '../controllers/mesas.controller.js';

const router = Router();

// Públicas
router.get('/mesas', listarMesas);
router.get('/mesas/:codigo', obtenerMesaPorCodigo);
router.post('/mesas/:codigo/ocupar', identificarCliente, ocuparMesa);   // al escanear el QR

// Personal (pasan por verificarToken del archivo personal.routes, y aquí por el rol)
router.get('/personal/mesas', verificarToken, permitirRoles('mesero', 'caja', 'admin'), detalleMesas);
router.patch('/personal/mesas/:id/liberar', verificarToken, permitirRoles('mesero', 'admin'), liberarMesa);

// Admin
router.post('/admin/mesas', verificarToken, permitirRoles('admin'), agregarMesa);

export default router;
