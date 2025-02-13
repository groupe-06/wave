import express from 'express';
import TransactionController from '../controllers/TransactionController.js';
import { getToken } from '../middlewares/authMiddleware.js';

const transRoute = express.Router();

// Route pour effectuer une transaction (dépôt, retrait ou transfert)
transRoute.post('/create', getToken, TransactionController.executeTransaction);
transRoute.post('/cancel/:transactionId', getToken, TransactionController.cancelTransaction);
export default transRoute;