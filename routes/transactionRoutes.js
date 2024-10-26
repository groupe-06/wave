import express from 'express';
import TransactionController from '../controllers/TransactionController.js';
import { getToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route pour effectuer une transaction (dépôt, retrait ou transfert)
router.post('/create', getToken, TransactionController.executeTransaction);
router.post('/cancel/:transactionId', getToken, TransactionController.cancelTransaction);
export default router;
