import express from 'express';
import { getMorosos, sendAvisoCobranza, getIngresosTarifa, getTopConsumidores } from '../controllers/contabilidadController.js';

const router = express.Router();

router.get('/ingresos-tarifa', getIngresosTarifa);
router.get('/top-consumidores', getTopConsumidores);

// Ruta para obtener los deudores más morosos
router.get('/morosos', getMorosos);

// Ruta para enviar aviso de cobranza
router.post('/aviso-cobranza', sendAvisoCobranza);

export default router;
