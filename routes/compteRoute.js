// routes/compteRoute.js

import express from 'express';
import { modifyStateAccount } from '../controllers/compteController.js';
import { getToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.patch('/:compteId/etat', getToken, modifyStateAccount);

export default router;
