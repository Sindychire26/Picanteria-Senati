// =====================================================================
//  promociones.routes.js — RUTAS de las promociones
// =====================================================================
import { Router } from 'express';
import { listarPromociones } from '../controllers/promociones.controller.js';

const router = Router();

router.get('/promociones', listarPromociones);

export default router;
