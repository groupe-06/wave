import Compte from "../models/compte.js";
import mongoose from "mongoose";
/**
 * Déplafonner le solde maximum d'un compte
 * @param {Request} req
 * @param {Response} res
 */

// Dans votre fonction deplafonnerCompte
export const deplafonnerCompte = async (req, res) => {
    const { compteId } = req.params;
    const { soldeMaximum } = req.body;

    // Vérifiez si compteId est un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(compteId)) {
        return res.status(400).json({ message: "Identifiant de compte invalide" });
    }

    try {
        const compte = await Compte.findById(compteId);
        if (!compte) {
            return res.status(404).json({ message: "Compte non trouvé" });
        }

        compte.soldeMaximum = soldeMaximum;
        await compte.save();

        return res.status(200).json({ message: "Compte déplafonné avec succès", compte });
    } catch (error) {
        console.error("Erreur lors du déplafonnement du compte:", error);
        return res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};
