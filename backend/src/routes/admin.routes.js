// =====================================================================
//  admin.routes.js — RUTAS del administrador (solo rol "admin")
// =====================================================================
import { Router } from 'express';
import { verificarToken, permitirRoles } from '../middlewares/auth.js';
import {
  resumen, movimientos, platosAdmin, crearPlato, actualizarPlato, eliminarPlato,
  categoriasAdmin, crearCategoria, renombrarCategoria, moverCategoria, eliminarCategoria,
} from '../controllers/admin.controller.js';

const router = Router();

// Todas las rutas /admin pasan por: ¿inició sesión? → ¿es admin?
router.use('/admin', verificarToken, permitirRoles('admin'));

router.get('/admin/resumen', resumen);
router.get('/admin/movimientos', movimientos);
router.get('/admin/platos', platosAdmin);
router.post('/admin/platos', crearPlato);
router.patch('/admin/platos/:id', actualizarPlato);
router.delete('/admin/platos/:id', eliminarPlato);
router.get('/admin/categorias', categoriasAdmin);
router.post('/admin/categorias', crearCategoria);
router.patch('/admin/categorias/:id', renombrarCategoria);
router.post('/admin/categorias/:id/mover', moverCategoria);
router.delete('/admin/categorias/:id', eliminarCategoria);

export default router;
