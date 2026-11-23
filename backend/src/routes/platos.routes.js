// =====================================================================
//  platos.routes.js — RUTAS de la carta
//  Solo dice: "si llega esta URL, ejecuta esta función del controlador".
// =====================================================================
import { Router } from 'express';
import {
  listarCategorias,
  listarPlatos,
  platosMasPedidos,
  obtenerPlato,
} from '../controllers/platos.controller.js';

const router = Router();

router.get('/categorias', listarCategorias);
router.get('/platos', listarPlatos);
router.get('/platos/mas-pedidos', platosMasPedidos); // va ANTES de /platos/:id
router.get('/platos/:id', obtenerPlato);             // si no, "mas-pedidos" se tomaría como un id

export default router;
