// =====================================================================
//  personal.routes.js — RUTAS PROTEGIDAS del personal
//  Antes de llegar al controlador pasan por los middlewares:
//  verificarToken (¿inició sesión?) → permitirRoles (¿tiene permiso?)
// =====================================================================
import { Router } from 'express';
import { verificarToken, permitirRoles } from '../middlewares/auth.js';
import { pedidosDelRol, cambiarEstado } from '../controllers/personal.controller.js';

const router = Router();

// router.use: aplica verificarToken a TODAS las rutas de este archivo
router.use('/personal', verificarToken);

router.get('/personal/pedidos', permitirRoles('cocina', 'mesero', 'caja', 'admin'), pedidosDelRol);
router.patch('/personal/pedidos/:id/estado', permitirRoles('cocina', 'mesero', 'caja', 'admin'), cambiarEstado);

export default router;
