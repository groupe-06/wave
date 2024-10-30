// controllers/compteController.js

import Compte from "../models/compte.js";

// Fonction pour activer ou désactiver un compte
export const modifyStateAccount = async (req, res) => {
    const { compteId } = req.params;
    const { etat } = req.body; // 'ACTIF' ou 'INACTIF'

    if (!['ACTIF', 'INACTIF'].includes(etat)) {
        return res.status(400).json({ message: 'Etat invalide. Utilisez "ACTIF" ou "INACTIF"' });
    }
 
    try {
        const compte = await Compte.findByIdAndUpdate(
            compteId,
            { etat },
            { new: true }
        );
        
        if (!compte) {
            return res.status(404).json({ message: 'Compte non trouvé' });
        }

        return res.status(200).json({ message: `Compte ${etat}`, data: compte });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour du compte', error });
    }
    
};
export const getCompteByUser = async (req, res) => {
    const userId = req.userId; // ID de l'utilisateur connecté extrait du token

    try {
        const compte = await Compte.findOne({ utilisateur: userId });
        
        if (!compte) {
            return res.status(404).json({ message: 'Compte non trouvé pour cet utilisateur' });
        }

        return res.status(200).json({ message: 'Compte récupéré avec succès', data: compte });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur lors de la récupération du compte', error });
    }
};
