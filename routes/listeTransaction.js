import express from 'express';
import { listAllTransactions } from '../controllers/listeTransactionController.js';

const router = express.Router();

// Endpoint pour lister toutes les transactions
router.get('/', listAllTransactions);

export default router;
