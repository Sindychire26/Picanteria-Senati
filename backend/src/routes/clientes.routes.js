// =====================================================================
//  clientes.routes.js — RUTAS de las cuentas de clientes
//  registro y login son públicas; lo demás necesita haber iniciado sesión
// =====================================================================
import { Router } from 'express';
import { verificarCliente } from '../middlewares/auth.js';
import {
  registro, login, perfil, guardarTarjeta, borrarTarjeta,
} from '../controllers/clientes.controller.js';

const router = Router();

router.post('/clientes/registro', registro);
router.post('/clientes/login', login);
router.get('/clientes/yo', verificarCliente, perfil);
router.post('/clientes/metodos', verificarCliente, guardarTarjeta);
router.delete('/clientes/metodos/:id', verificarCliente, borrarTarjeta);

export default router;
