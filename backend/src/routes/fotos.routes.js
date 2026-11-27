// =====================================================================
//  fotos.routes.js — RUTAS de las fotos subidas
//  Ver la foto: público.  Subir una foto: solo admin.
// =====================================================================
import { Router } from 'express';
import { verificarToken, permitirRoles } from '../middlewares/auth.js';
import { subirFoto, servirFoto } from '../controllers/fotos.controller.js';

const router = Router();

router.get('/fotos/:id', servirFoto);
router.post('/admin/fotos', verificarToken, permitirRoles('admin'), subirFoto);

export default router;
