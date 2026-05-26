import express from 'express';
import { simularNotificacion } from '../controllers/notificacionController.js';

const router = express.Router();

router.post('/simular', simularNotificacion);

export default router;
