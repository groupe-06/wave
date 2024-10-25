import express from "express";
import { createTypeTransaction } from "../controllers/typeTransactionController.js";

const typeTransactionRoute = express.Router();

typeTransactionRoute.post("/create", createTypeTransaction);

export default typeTransactionRoute;