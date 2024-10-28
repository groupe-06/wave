// deplafonController.js
import Deplafonnement from '../models/deplafonnement.js';
import Compte from '../models/compte.js';
import Utilisateur from '../models/utilisateur.js';

// Client requests deplafonnement
export const requestDeplafonnement = async (req, res) => {
    const { photoPiece1, photoPiece2 } = req.body;
    const userId = req.userId; // User ID from token

    if (!photoPiece1) {
        return res.status(400).json({ message: "photoPiece1 is required" });
    }

    try {
        const request = await Deplafonnement.create({
            utilisateur: userId,
            photoPiece1,
            photoPiece2,
            status: 'EN_COURS'
        });
        res.status(201).json({ message: "Request created", request });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Admin validates deplafonnement
export const validateDeplafonnement = async (req, res) => {
    const { soldeMaximum, cummulTransactionMensuelle } = req.body;
    const requestId = req.params.requestId;
    const userId = req.userId;

    // Ensure the user is an admin
    const user = await Utilisateur.findById(userId);
    if (user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Forbidden" });
    }

    try {
        const request = await Deplafonnement.findById(requestId);
        if (!request || request.status !== 'EN_COURS') {
            return res.status(404).json({ message: "Request not found or already processed" });
        }

        // Update the Compte linked to the request user
        await Compte.findOneAndUpdate(
            { utilisateur: request.utilisateur },
            { soldeMaximum, cummulTransactionMensuelle }
        );

        request.status = 'VALIDÉ';
        await request.save();
        res.status(200).json({ message: "Request validated", request });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
