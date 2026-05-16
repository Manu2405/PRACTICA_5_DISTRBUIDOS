import express from 'express';
import { getErroresModelo, getErroresDistrito } from '../controllers/administracionController.js';

const router = express.Router();

router.get('/errores-modelo', getErroresModelo);
router.get('/errores-distrito', getErroresDistrito);

export default router;
