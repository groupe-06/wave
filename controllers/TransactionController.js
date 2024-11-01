import TransactionService from '../services/TransactionService.js';

class TransactionController {
    static async executeTransaction(req, res) {
        try {
            const { transaction, montant, recever_telephone, sender_telephone, frais } = req.body;

            // Vérifier si c'est une transaction à soi-même
            if (transaction.toLowerCase() === 'transfert' && req.userId === recever_telephone) {
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
                        sender_telephone: req.body.sender_telephone || req.userId, // Utiliser l'ID de l'utilisateur connecté si sender_telephone n'est pas fourni
                        recever_telephone,
                        transaction: 'transfert',
                        frais
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
}

export default TransactionController;