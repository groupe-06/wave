import express from "express";
import { transactionClient } from "../controllers/transfertClientController.js";
import { getAllTransactionsClients } from "../controllers/transfertClientController.js";
import { annulerTransaction } from "../controllers/transfertClientController.js";
import { getToken } from "../middlewares/authMiddleware.js";

const transactionClientRoute = express.Router();

transactionClientRoute.post("/transfert",getToken, transactionClient);
transactionClientRoute.get("/transaction/all",getToken, getAllTransactionsClients);
transactionClientRoute.post("/annuler-transaction",getToken, annulerTransaction);

export default transactionClientRoute;