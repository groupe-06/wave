import express from "express";
import { transactionClient } from "../controllers/transfertClientController.js";
import { getAllTransactionsClients } from "../controllers/transfertClientController.js";

const transactionClientRoute = express.Router();

transactionClientRoute.post("/transfert", transactionClient);
transactionClientRoute.get("/transaction/all", getAllTransactionsClients);

export default transactionClientRoute;