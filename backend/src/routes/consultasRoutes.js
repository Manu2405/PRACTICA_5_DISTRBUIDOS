import express from 'express';
import { getContrato, getMedidor, getConsumo, dispatchConsulta } from '../controllers/consultasController.js';

const router = express.Router();

// Endpoints de búsqueda directa
router.get('/contrato/:n', getContrato);
router.get('/medidor/:s', getMedidor);
router.get('/consumo/:c', getConsumo);

// 25 consultas estratégicas del PDF (Q1..Q25)
// Acepta query params: ?periodo=2026-04&distrito=MOLLE
router.get('/:id(\\d+)', dispatchConsulta);

export default router;
