import express from 'express';
import { buscar } from '../controllers/visorController.js';

const router = express.Router();

router.get('/buscar', buscar);

export default router;
