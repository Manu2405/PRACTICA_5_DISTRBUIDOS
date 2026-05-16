import express from 'express';
import { generarFactura } from '../controllers/facturacionController.js';

const router = express.Router();

router.post('/generar', generarFactura);

export default router;
