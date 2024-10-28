import express from 'express';
import { listAllTransactions } from '../controllers/listeTransactionController.js';
import { getToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Endpoint pour lister toutes les transactions
router.get('/', getToken,listAllTransactions);

export default router;
