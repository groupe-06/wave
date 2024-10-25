import express from "express";
import { deplafonnerCompte } from "../controllers/deplafonController.js";

const router = express.Router();

// Route pour déplafonner un compte
router.put("/deplafonner", deplafonnerCompte);

export default router;
