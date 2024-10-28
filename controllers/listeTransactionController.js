import Transaction from '../models/transaction.js';
import Utilisateur from '../models/utilisateur.js'; // Importer le modèle Utilisateur pour vérifier le rôle

// Fonction pour lister toutes les transactions
export const listAllTransactions = async (req, res) => {
    try {
        // Vérifier si l'utilisateur connecté est un admin
        const user = await Utilisateur.findById(req.userId); // On suppose que req.userId a été défini par votre middleware getToken

        if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Accès refusé : seul un administrateur peut lister les transactions.' });
        }

        const transactions = await Transaction.find()
            .populate('receiver', 'prenom') // Remplacez 'prenom' par le champ que vous souhaitez afficher
            .populate('sender', 'prenom')   // Remplacez 'prenom' par le champ que vous souhaitez afficher
            .populate('TypeTransaction', 'type'); // Remplacez 'type' par le champ que vous souhaitez afficher

        return res.status(200).json(transactions);
    } catch (error) {
        console.error("Erreur lors de la récupération des transactions:", error);
        return res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};
