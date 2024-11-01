// controllers/DeplafonnementController.js
import Deplafonnement from '../models/deplafonnement.js';
import Compte from '../models/compte.js';
import Utilisateur from '../models/utilisateur.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
const DeplafonnementController = {
    deplafonner: async (req, res) => {
        try {
            // Récupération de l'userId injecté par le middleware getToken
            const userId = req.userId;

            // Validation du champ soldeMaximum dans la requête
            const { soldeMaximum } = req.body;
            if (!soldeMaximum) return res.status(400).json({ message: "Le solde maximum est requis." });

            // Vérification si les fichiers photos sont inclus dans la requête
            if (!req.files || req.files.length < 2) {
                return res.status(400).json({ message: "Deux photos sont requises." });
            }

            // Téléchargement des photos sur Cloudinary
            const photoUrls = await Promise.all(req.files.map(file => uploadToCloudinary(file)));

            // Mise à jour de l'utilisateur avec les nouvelles photos de pièces
            await Utilisateur.findByIdAndUpdate(userId, {
                photoPiece1: photoUrls[0].secure_url,
                photoPiece2: photoUrls[1].secure_url
            });

            // Mise à jour du compte avec le nouveau solde maximum
            await Compte.findOneAndUpdate(
                { utilisateur: userId },
                { soldeMaximum },
                { new: true }
            );

            res.status(200).json({ message: "Déplafonnement réussi, solde maximum mis à jour et photos ajoutées." });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Erreur lors du déplafonnement." });
        }
    }
};

export default DeplafonnementController;
