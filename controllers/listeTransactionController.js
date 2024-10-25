import Transaction from '../models/transaction.js';

// Fonction pour lister toutes les transactions
export const listAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('receiver', 'prenom') // Remplacez 'nom' par le champ que vous souhaitez afficher
            .populate('sender', 'prenom')   // Remplacez 'nom' par le champ que vous souhaitez afficher
            .populate('TypeTransaction', 'type'); // Remplacez 'type' par le champ que vous souhaitez afficher

        return res.status(200).json(transactions);
    } catch (error) {
        console.error("Erreur lors de la récupération des transactions:", error);
        return res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};
