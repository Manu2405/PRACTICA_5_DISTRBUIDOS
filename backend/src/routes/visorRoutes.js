import express from 'express';
import { buscar, pagar } from '../controllers/visorController.js';

const router = express.Router();

router.get('/buscar', buscar);
router.post('/pagar', pagar);

export default router;
