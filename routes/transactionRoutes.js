import express from 'express';
import TransactionController from '../controllers/TransactionController.js';
import { getToken,isAdmin} from "../middlewares/authMiddleware.js";
import DemandeAnnulationController from '../controllers/DemandeAnnulationController.js';

const router = express.Router();

// Route pour effectuer une transaction (dépôt, retrait ou transfert)
router.post('/create', getToken, TransactionController.executeTransaction);
router.post('/cancel/:transactionId', getToken, TransactionController.cancelTransaction);
router.post('/demandes-annulation', getToken, DemandeAnnulationController.creerDemande);

// Route pour traiter une demande d'annulation (accessible uniquement aux admins)
router.put('/demandes-annulation/:id/traiter', getToken, DemandeAnnulationController.traiterDemande);

// Route pour obtenir toutes les demandes (accessible uniquement aux admins)
router.get('/demandes-annulation', getToken, DemandeAnnulationController.getAllDemandes);

// Route pour obtenir les demandes d'un utilisateur spécifique
router.get('/mes-demandes-annulation', getToken, DemandeAnnulationController.getMesDemandes);
router.get('/transactions/transferts/succes', getToken, TransactionController.getUserTransfers);
// Nouvelles routes
router.post('/mass-transfer', getToken, TransactionController.executeMassTransaction);
router.post('/schedule', getToken, TransactionController.scheduleTransaction);
router.get('/scheduled', getToken, TransactionController.getScheduledTransactions);

export default router;
