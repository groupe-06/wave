// deplafonController.js
import Deplafonnement from '../models/deplafonnement.js';
import Compte from '../models/compte.js';
import Utilisateur from '../models/utilisateur.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import NotificationService from '../services/NotificationService.js';
// Client requests deplafonnement
export const requestDeplafonnement = async (req, res) => {
    try {
        const userId = req.userId;
        const { photoPiece1, photoPiece2 } = req.files || {};

        // Vérifier si la première photo est présente
        if (!photoPiece1) {
            return res.status(400).json({ message: "La photo de pièce 1 est requise" });
        }

        // Récupérer les informations de l'utilisateur
        const utilisateur = await Utilisateur.findById(userId);
        if (!utilisateur) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Vérifier le nombre de demandes déjà validées pour cet utilisateur
        const demandesValidees = await Deplafonnement.countDocuments({
            utilisateur: userId,
            status: 'VALIDÉ'
        });

        if (demandesValidees >= 2) {
            return res.status(400).json({ 
                message: "Vous avez déjà atteint le nombre maximum de demandes de déplafonnement validées (2)"
            });
        }

        // Télécharger la première photo sur Cloudinary
        const uploadedPhotoPiece1 = await uploadToCloudinary(photoPiece1[0]);

        // Télécharger la deuxième photo si elle existe
        let uploadedPhotoPiece2 = null;
        if (photoPiece2 && photoPiece2.length > 0) {
            uploadedPhotoPiece2 = await uploadToCloudinary(photoPiece2[0]);
        }

        // Créer la demande de déplafonnement
        const request = await Deplafonnement.create({
            utilisateur: userId,
            photoPiece1: uploadedPhotoPiece1.secure_url,
            photoPiece2: uploadedPhotoPiece2 ? uploadedPhotoPiece2.secure_url : null,
            status: 'EN_COURS',
            nomUtilisateur: utilisateur.nom,
            prenomUtilisateur: utilisateur.prenom,
            photoProfile: utilisateur.photoProfile,
            roleUtilisateur: utilisateur.role,
        });

        res.status(201).json({ 
            message: "Demande de déplafonnement créée avec succès", 
            request 
        });

    } catch (error) {
        console.error("Erreur lors de la création de la demande:", error);
        res.status(500).json({ 
            message: "Erreur serveur", 
            error: error.message 
        });
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
        const message = `Votre demande de déplafonnement a été validée. Votre nouveau solde maximum est de ${soldeMaximum}.`;
        await NotificationService.createNotification(
            request.utilisateur, // ID de l'utilisateur qui a fait la demande
            message,
            "DEPLAFONNEMENT_VALIDÉ" // Vous pouvez utiliser un type de notification spécifique
        );
        
        res.status(200).json({ message: "Request validated", request });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
export const getPendingDeplafonnements = async (req, res) => {
    try {
        const userId = req.userId;

        // Vérifier si l'utilisateur est un admin
        const user = await Utilisateur.findById(userId);
        if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({ message: "Accès refusé" });
        }

        // Récupérer les demandes avec le statut "EN_COURS" et populate les informations utilisateur
        const pendingRequests = await Deplafonnement.find({ status: 'EN_COURS' })
            .populate('utilisateur', 'nom prenom photoProfile role')
            .lean()
            .exec();

        // Transformer les données pour correspondre à l'interface
        const transformedRequests = pendingRequests.map(request => ({
            ...request,
            nomUtilisateur: request.utilisateur.nom,
            prenomUtilisateur: request.utilisateur.prenom,
            photoProfile: request.utilisateur.photoProfile,
            roleUtilisateur: request.utilisateur.role,
            utilisateur: request.utilisateur._id
        }));

        res.status(200).json({
            message: "Demandes de déplafonnement en cours récupérées avec succès",
            requests: transformedRequests
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des demandes:", error);
        res.status(500).json({
            message: "Erreur serveur",
            error: error.message
        });
    }

};