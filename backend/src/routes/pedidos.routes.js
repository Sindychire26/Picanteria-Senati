// =====================================================================
//  pedidos.routes.js — RUTAS de los pedidos
//  POST  = crear     GET = consultar     PATCH = modificar una parte
// =====================================================================
import { Router } from 'express';
import { identificarCliente } from '../middlewares/auth.js';
import { crearPedido, pedidosDeCuenta, cancelarPedido } from '../controllers/pedidos.controller.js';

const router = Router();

router.post('/pedidos', identificarCliente, crearPedido);   // el cliente puede ser invitado o registrado
router.get('/cuentas/:id/pedidos', pedidosDeCuenta);
router.patch('/pedidos/:id/cancelar', cancelarPedido);

export default router;
