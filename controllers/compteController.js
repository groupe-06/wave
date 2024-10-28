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
