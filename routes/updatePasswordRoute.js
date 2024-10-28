import express from 'express';
import { updatePassword } from '../controllers/updatePasswordController.js';
import { getToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route pour la mise à jour du mot de passe de l'utilisateur connecté
router.patch('/update-password', getToken, updatePassword);

export default router;
