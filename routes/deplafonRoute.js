
// deplafonRoute.js
import express from 'express';
import { requestDeplafonnement, validateDeplafonnement } from '../controllers/deplafonController.js';
import { getToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Client requests deplafonnement
router.post('/request', getToken, requestDeplafonnement);

// Admin validates deplafonnement
router.post('/validate/:requestId', getToken, validateDeplafonnement);

export default router;
