import bcrypt from 'bcrypt';
import Utilisateur from '../models/utilisateur.js';

export const updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        // Récupérer l'utilisateur par l'ID décodé dans `getToken`
        const user = await Utilisateur.findById(req.userId);

        // Vérifier si l'utilisateur existe
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Vérifier si le mot de passe actuel est correct
        const isMatch = await bcrypt.compare(currentPassword, user.mdp);
        if (!isMatch) {
            return res.status(400).json({ message: "Mot de passe actuel incorrect" });
        }

        // Hacher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Mettre à jour le mot de passe de l'utilisateur
        user.mdp = hashedPassword;
        await user.save();

        res.status(200).json({ message: "Mot de passe mis à jour avec succès" });
    } catch (error) {
        console.error("Erreur lors de la mise à jour du mot de passe:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
    }
};
