import express from 'express';
import { login, refresh } from '../controllers/mobile/authController.js';
import { listMedidores, getMedidorByCodigo } from '../controllers/mobile/medidoresController.js';
import { registrarLectura, getHistorial } from '../controllers/mobile/lecturasController.js';
import { getTarifas, calcularFactura } from '../controllers/mobile/tarifasController.js';
import { getDashboardMobile } from '../controllers/mobile/dashboardController.js';
import { simularLecturaLorawan, simularBatchLorawan } from '../controllers/mobile/lorawanController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Auth (público)
router.post('/auth/login', login);
router.post('/auth/refresh', refresh);

// Protegido
router.get('/mobile/dashboard', requireAuth(), getDashboardMobile);
router.get('/medidores', requireAuth(), listMedidores);
router.get('/medidores/:codigo', requireAuth(), getMedidorByCodigo);
router.post('/lecturas', requireAuth(['lector', 'administrador']), registrarLectura);
router.get('/lecturas/historial', requireAuth(), getHistorial);
router.get('/tarifas', requireAuth(), getTarifas);
router.post('/calcular-factura', requireAuth(), calcularFactura);
router.post('/lorawan/simular', requireAuth(), simularLecturaLorawan);
router.post('/lorawan/simular-batch', requireAuth(['administrador']), simularBatchLorawan);

export default router;
