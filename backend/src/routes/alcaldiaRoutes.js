import express from 'express';
import { getMapaDistritos, getKpis } from '../controllers/alcaldiaController.js';

const router = express.Router();

router.get('/mapa-distritos', getMapaDistritos);
router.get('/kpis', getKpis);

export default router;
