import express from 'express';
import { getResumen, getConsumoDistrito, getMapaMedidores, getMedidoresEstado } from '../controllers/operacionalController.js';

const router = express.Router();

router.get('/resumen', getResumen);
router.get('/consumo-distrito', getConsumoDistrito);
router.get('/mapa-medidores', getMapaMedidores);
router.get('/medidores-estado', getMedidoresEstado);

export default router;
