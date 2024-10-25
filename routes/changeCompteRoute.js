import express from 'express';
import { updateUserRole } from '../controllers/changeCompteController.js';

const router = express.Router();

// Endpoint pour mettre à jour le rôle d'un utilisateur
router.put('/:userId/role', updateUserRole);

export default router;
