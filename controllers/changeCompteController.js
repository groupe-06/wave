import Utilisateur from "../models/utilisateur.js";
import mongoose from 'mongoose'; // Assurez-vous d'importer mongoose

// Fonction pour mettre à jour le rôle d'un utilisateur
export const updateUserRole = async (req, res) => {
    const { userId } = req.params; // ID de l'utilisateur à mettre à jour

    try {
        // Validation de l'ID
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "ID utilisateur invalide" });
        }
            // Vérifier si l'utilisateur connecté est un admin
    const adminUser = await Utilisateur.findById(req.userId); // On suppose que req.userId a été défini par votre middleware getToken

    if (!adminUser || adminUser.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Accès refusé : seul un administrateur peut modifier l\'état d\'un compte.' });
    }

        // Trouver l'utilisateur
        const utilisateur = await Utilisateur.findById(userId);
        
        if (!utilisateur) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Vérifiez que l'utilisateur a le rôle 'CLIENT' avant de le promouvoir
        if (utilisateur.role !== 'CLIENT') {
            return res.status(400).json({ message: "Seul un utilisateur avec le rôle 'CLIENT' peut devenir un 'AGENT'" });
        }

        // Mettre à jour le rôle de l'utilisateur
        utilisateur.role = 'AGENT'; // Mise à jour du rôle
        await utilisateur.save(); // Sauvegarde des modifications

        return res.status(200).json(utilisateur);
    } catch (error) {
        console.error("Erreur lors de la mise à jour du rôle de l'utilisateur:", error);
        return res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};
