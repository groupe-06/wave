// compteController.js
import Compte from '../models/compte.js';

/**
 * Déplafonner le solde maximum d'un compte
 * @param {Request} req
 * @param {Response} res
 */
export const deplafonnerCompte = async (req, res) => {
    const { utilisateurId, soldeMaximum } = req.body; // Extraire les données du corps de la requête

    try {
        // Vérifier l'existence du compte pour cet utilisateur
        const compte = await Compte.findOne({ utilisateur: utilisateurId });
        if (!compte) {
            return res.status(404).json({ message: "Compte non trouvé pour cet utilisateur" });
        }

        // Mettre à jour le solde maximum
        compte.soldeMaximum = soldeMaximum; // Vous pouvez également définir `soldeMaximum` à null pour déplafonner complètement
        await compte.save();

        return res.status(200).json({ message: "Compte déplafonné avec succès", compte });
    } catch (error) {
        console.error("Erreur lors du déplafonnement du compte:", error);
        return res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};
