// routes/compteRoute.js

import express from 'express';
import { modifyStateAccount } from '../controllers/compteController.js';

const router = express.Router();

router.patch('/:compteId/etat', modifyStateAccount);

export default router;
