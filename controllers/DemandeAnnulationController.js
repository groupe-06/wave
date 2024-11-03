// controllers/DemandeAnnulationController.js
import DemandeAnnulationService from '../services/DemandeAnnulationService.js';
import Utilisateur from '../models/utilisateur.js';

class DemandeAnnulationController {
    static async creerDemande(req, res) {
        try {
            const { transactionId, motif } = req.body;
            const userId = req.userId; // Récupéré du token via middleware

            // Validation des données
            if (!transactionId || !motif) {
                return res.status(400).json({
                    success: false,
                    message: "L'ID de transaction et le motif sont requis"
                });
            }

            const resultat = await DemandeAnnulationService.creerDemandeAnnulation(
                transactionId,
                userId,
                motif
            );

            res.status(201).json({
                success: true,
                message: "Demande d'annulation créée avec succès",
                demande: resultat.demande
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    static async traiterDemande(req, res) {
        try {
            const { nouvelEtat } = req.body;
            const demandeId = req.params.id;
            const adminId = req.userId;

            // Validation des données
            if (!nouvelEtat || !demandeId) {
                return res.status(400).json({
                    success: false,
                    message: "L'ID de la demande et le nouvel état sont requis"
                });
            }

            // Vérifier que l'état est valide
            if (!['APPROUVEE', 'REFUSEE'].includes(nouvelEtat)) {
                return res.status(400).json({
                    success: false,
                    message: "L'état doit être soit APPROUVEE soit REFUSEE"
                });
            }

            // Vérifier que l'utilisateur est un admin
            const admin = await Utilisateur.findById(adminId);
            if (!admin || admin.role !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: "Seuls les administrateurs peuvent traiter les demandes d'annulation"
                });
            }

            const resultat = await DemandeAnnulationService.traiterDemandeAnnulation(
                demandeId,
                nouvelEtat,
                adminId
            );

            res.status(200).json(resultat);

        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    static async getAllDemandes(req, res) {
        try {
            const { etat } = req.query;
            let filter = {};

            // Si un état est spécifié dans la requête
            if (etat) {
                filter.etat = etat.toUpperCase();
            }

            const demandes = await DemandeAnnulation.find(filter)
                .populate({
                    path: 'transaction',
                    populate: [
                        { path: 'sender', populate: 'utilisateur' },
                        { path: 'receiver', populate: 'utilisateur' }
                    ]
                })
                .populate('utilisateur')
                .sort({ dateDemande: -1 }); // Tri par date décroissante

            res.status(200).json({
                success: true,
                demandes
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    static async getMesDemandes(req, res) {
        try {
            const userId = req.userId;
            const { etat } = req.query;
            let filter = { utilisateur: userId };

            // Si un état est spécifié dans la requête
            if (etat) {
                filter.etat = etat.toUpperCase();
            }

            const demandes = await DemandeAnnulation.find(filter)
                .populate({
                    path: 'transaction',
                    populate: [
                        { path: 'sender', populate: 'utilisateur' },
                        { path: 'receiver', populate: 'utilisateur' }
                    ]
                })
                .sort({ dateDemande: -1 }); // Tri par date décroissante

            res.status(200).json({
                success: true,
                demandes
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default DemandeAnnulationController;