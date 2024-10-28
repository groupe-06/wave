import TransactionService from '../services/TransactionService.js';

class TransactionController {
    static async executeTransaction(req, res) {
        try {
            const result = await TransactionService.executeTransaction(req.body, req.userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async executeTransaction(req, res) {
        try {
            const result = await TransactionService.executeTransaction(req.body, req.userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async cancelTransaction(req, res) {
        try {
            const result = await TransactionService.cancelTransaction(req.params.transactionId, req.userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    
}

export default TransactionController;
