// =====================================================================
//  admin.routes.js — RUTAS del administrador (solo rol "admin")
// =====================================================================
import { Router } from 'express';
import { verificarToken, permitirRoles } from '../middlewares/auth.js';
import { resumen, movimientos, platosAdmin, actualizarPlato } from '../controllers/admin.controller.js';

const router = Router();

// Todas las rutas /admin pasan por: ¿inició sesión? → ¿es admin?
router.use('/admin', verificarToken, permitirRoles('admin'));

router.get('/admin/resumen', resumen);
router.get('/admin/movimientos', movimientos);
router.get('/admin/platos', platosAdmin);
router.patch('/admin/platos/:id', actualizarPlato);

export default router;
