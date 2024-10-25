import express from "express";
import { modifyStateAccount } from "../controllers/compteController.js";
import { getToken } from "../middlewares/authMiddleware.js";

const compteRoute = express.Router();

compteRoute.post("/modify-state", getToken, modifyStateAccount);

export default compteRoute;