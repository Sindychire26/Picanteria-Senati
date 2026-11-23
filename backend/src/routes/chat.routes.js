// =====================================================================
//  chat.routes.js — RUTA del asistente con IA
// =====================================================================
import { Router } from 'express';
import { conversar } from '../controllers/chat.controller.js';

const router = Router();

router.post('/chat', conversar);

export default router;
