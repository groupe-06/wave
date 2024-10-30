// routes/compteRoute.js

import express from 'express';
import { modifyStateAccount,getCompteByUser } from '../controllers/compteController.js';
import { getToken } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.get('/mon-compte', getToken, getCompteByUser);

router.patch('/:compteId/etat', getToken, modifyStateAccount);

export default router;
