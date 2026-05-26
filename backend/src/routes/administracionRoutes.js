import express from 'express';
import { getErroresModelo, getErroresDistrito, getLecturasApp } from '../controllers/administracionController.js';

const router = express.Router();

router.get('/errores-modelo', getErroresModelo);
router.get('/errores-distrito', getErroresDistrito);
router.get('/lecturas-app', getLecturasApp);

export default router;
