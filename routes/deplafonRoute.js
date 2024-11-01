
// deplafonRoute.js
import express from 'express';
import { requestDeplafonnement, validateDeplafonnement,getPendingDeplafonnements } from '../controllers/deplafonController.js';
import { getToken } from '../middlewares/authMiddleware.js';
import upload from '../utils/multer.js';

const router = express.Router();

// Client requests deplafonnement
router.post('/request', getToken, upload.fields([
    { name: 'photoPiece1', maxCount: 1 },
    { name: 'photoPiece2', maxCount: 1 }
]), requestDeplafonnement);

// Admin validates deplafonnement
router.post('/validate/:requestId', getToken, validateDeplafonnement);
/* router.post('/request', getToken, upload.array('photos', 2), DeplafonnementController.deplafonner); */
router.get('/pending', getToken, getPendingDeplafonnements);
export default router;
