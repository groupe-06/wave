import express from 'express';
import { updateUserRole } from '../controllers/changeCompteController.js';
import { getToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.patch('/:userId/role', getToken, updateUserRole);


export default router;
