// =====================================================================
//  mesas.routes.js — RUTAS de las mesas
// =====================================================================
import { Router } from 'express';
import { listarMesas, obtenerMesaPorCodigo } from '../controllers/mesas.controller.js';

const router = Router();

router.get('/mesas', listarMesas);
router.get('/mesas/:codigo', obtenerMesaPorCodigo);

export default router;
