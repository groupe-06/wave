import express from "express";
import { deplafonnerCompte } from "../controllers/deplafonController.js";

const router = express.Router();

// Route pour déplafonner un compte avec l'ID du compte comme paramètre
router.put("/:compteId/deplafonner", deplafonnerCompte);

export default router;
