import express from 'express';
import { getDistritos, getTarifas, getGateways, getContratos } from '../controllers/catalogosController.js';

const router = express.Router();

router.get('/distritos', getDistritos);
router.get('/tarifas', getTarifas);
router.get('/gateways', getGateways);
router.get('/contratos', getContratos);

export default router;
