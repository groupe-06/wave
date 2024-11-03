import TransactionService from '../services/TransactionService.js';
import { getUserIdByPhone } from './utilisateurController.js';
class TransactionController {
    static async executeTransaction(req, res) {
        try {
            const { transaction, montant, recever_telephone, sender_telephone, frais } = req.body;

            // Vérifier si c'est une transaction à soi-même
            if ((transaction.toLowerCase() === 'transfert' || transaction.toLowerCase() === 'payment') 
                && req.userId === recever_telephone) {
                return res.status(400).json({
                    success: false,
                    message: "Vous ne pouvez pas faire de transaction à vous-même."
                });
            }

            // Set the required request body properties based on the transaction type
            let reqBody;
            switch (transaction.toLowerCase()) {
                case 'transfert':
                    reqBody = {
                        montant,
                        sender_telephone: req.body.sender_telephone || req.userId,
                        recever_telephone,
                        transaction: 'transfert',
                        frais
                    };
                    break;
                case 'payement':
                    reqBody = {
                        montant,
                        sender_telephone: req.body.sender_telephone || req.userId,
                        recever_telephone,
                        transaction: 'payement'
                    };
                    break;
                case 'depot':
                    reqBody = {
                        montant,
                        sender_telephone: req.userId,
                        recever_telephone,
                        transaction: 'depot'
                    };
                    break;
                case 'retrait':
                    reqBody = {
                        montant,
                        sender_telephone,
                        recever_telephone: req.userId,
                        transaction: 'retrait'
                    };
                    break;
                default:
                    throw new Error("Type de transaction invalide");
            }

            const result = await TransactionService.executeTransaction(reqBody, req.userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async cancelTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            const result = await TransactionService.cancelTransaction(transactionId, req.userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getUserTransfers(req, res) {
        try {
            const userId = req.userId;
            const transactions = await TransactionService.getUserSuccessfulTransfers(userId);

            res.status(200).json({
                success: true,
                transactions
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Erreur lors de la récupération des transactions",
                error: error.message
            });
        }
    }
    static async executeMassTransaction(req, res) {
        try {
            const { montant, receiver_ids, transaction, frais } = req.body;
            
            const result = await TransactionService.executeMassTransaction({
                montant,
                receiver_ids,
                transaction,
                frais
            }, req.userId);

            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    }
    static async scheduleTransaction(req, res) {
        try {
            const { 
                receiver_ids, 
                montant, 
                dateExecution, 
                recurring, 
                frequence,
                frais 
            } = req.body;

            const result = await TransactionService.scheduleTransaction({
                receiver_ids,
                montant,
                dateExecution,
                recurring,
                frequence,
                frais
            }, req.userId);

            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    static async getScheduledTransactions(req, res) {
        try {
            const scheduledTransactions = await ScheduledTransaction.find({
                sender: req.userId
            }).populate('receiver_ids', 'prenom nom telephone');

            res.status(200).json({
                success: true,
                scheduledTransactions
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Erreur lors de la récupération des transactions programmées",
                error: error.message
            });
        }
    }
}

export default TransactionController;
