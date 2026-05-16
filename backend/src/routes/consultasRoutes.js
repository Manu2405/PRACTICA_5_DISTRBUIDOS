import express from 'express';
import { getContrato, getMedidor, getConsumo } from '../controllers/consultasController.js';

const router = express.Router();

router.get('/contrato/:n', getContrato);
router.get('/medidor/:s', getMedidor);
router.get('/consumo/:c', getConsumo);

export default router;
