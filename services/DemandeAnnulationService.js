import mongoose from 'mongoose';
import DemandeAnnulation from '../models/demandeAnnulation.js';
import Transaction from '../models/transaction.js';
import Compte from '../models/compte.js';
import TransactionService from './TransactionService.js';
import Utilisateur from '../models/utilisateur.js';

class DemandeAnnulationService {
    static async creerDemandeAnnulation(transactionId, userId, motif) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Récupérer la transaction avec les informations du sender
            const transaction = await Transaction.findById(transactionId)
                .populate({
                    path: 'sender',
                    populate: 'utilisateur'
                })
                .populate('TypeTransaction');

            // Vérifications
            if (!transaction) {
                throw new Error("Transaction non trouvée");
            }

            // Vérifier que c'est une transaction de type transfert
            if (transaction.TypeTransaction.nom !== 'transfert') {
                throw new Error("Seules les transactions de type transfert peuvent être annulées");
            }

            // Vérifier que l'utilisateur est bien le sender de la transaction
            if (transaction.sender.utilisateur._id.toString() !== userId) {
                throw new Error("Seul l'expéditeur de la transaction peut demander son annulation");
            }

            // Vérifier que la transaction n'est pas déjà annulée
            if (transaction.etat === 'ANNULER') {
                throw new Error("Cette transaction a déjà été annulée");
            }

            // Vérifier qu'il n'existe pas déjà une demande en cours pour cette transaction
            const demandeExistante = await DemandeAnnulation.findOne({
                transaction: transactionId,
                etat: 'EN_ATTENTE'
            });

            if (demandeExistante) {
                throw new Error("Une demande d'annulation est déjà en cours pour cette transaction");
            }

            // Créer la demande d'annulation
            const nouvelleDemande = new DemandeAnnulation({
                transaction: transactionId,
                utilisateur: userId,
                motif,
                etat: 'EN_ATTENTE',
                dateDemande: new Date()
            });

            await nouvelleDemande.save({ session });
            await session.commitTransaction();

            return {
                success: true,
                message: "Demande d'annulation créée avec succès",
                demande: nouvelleDemande
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async traiterDemandeAnnulation(demandeId, nouvelEtat, adminId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Vérifier que l'utilisateur est un admin
            const admin = await Utilisateur.findById(adminId);
            if (!admin || admin.role !== 'ADMIN') {
                throw new Error("Seuls les administrateurs peuvent traiter les demandes d'annulation");
            }

            // Récupérer la demande avec toutes les informations nécessaires
            const demande = await DemandeAnnulation.findById(demandeId)
                .populate({
                    path: 'transaction',
                    populate: [
                        { path: 'sender', populate: 'utilisateur' },
                        { path: 'receiver', populate: 'utilisateur' }
                    ]
                });

            if (!demande) {
                throw new Error("Demande d'annulation non trouvée");
            }

            if (demande.etat !== 'EN_ATTENTE') {
                throw new Error("Cette demande a déjà été traitée");
            }

            // Si la demande est approuvée
            if (nouvelEtat === 'APPROUVEE') {
                // Vérifier le solde du receiver
                const receiverAccount = await Compte.findById(demande.transaction.receiver._id);
                
                // Si le solde est insuffisant, on refuse automatiquement la demande
                if (receiverAccount.solde < demande.transaction.montant) {
                    nouvelEtat = 'REFUSEE';
                    await TransactionService.createNotification(
                        demande.transaction.sender.utilisateur._id,
                        `Votre demande d'annulation a été refusée car le solde du destinataire est insuffisant.`,
                        'ANNULATION_REFUSEE',
                        demande.transaction.sender.utilisateur.telephone
                    );
                } else {
                    // Procéder à l'annulation
                    const senderAccount = await Compte.findById(demande.transaction.sender._id);
                    
                    // Mettre à jour les soldes
                    receiverAccount.solde -= demande.transaction.montant;
                    senderAccount.solde += demande.transaction.montant;

                    // Mettre à jour l'état de la transaction
                    demande.transaction.etat = 'ANNULER';
                    
                    // Sauvegarder les modifications
                    await receiverAccount.save({ session });
                    await senderAccount.save({ session });
                    await demande.transaction.save({ session });

                    // Envoyer les notifications
                    await TransactionService.createNotification(
                        demande.transaction.sender.utilisateur._id,
                        `Votre demande d'annulation a été approuvée. Montant remboursé: ${demande.transaction.montant}. Nouveau solde: ${senderAccount.solde}`,
                        'ANNULATION_APPROUVEE',
                       /*  demande.transaction.sender.utilisateur.telephone */
                    );

                    await TransactionService.createNotification(
                        demande.transaction.receiver.utilisateur._id,
                        `La transaction de ${demande.transaction.montant} reçue de ${demande.transaction.sender.utilisateur.prenom} ${demande.transaction.sender.utilisateur.nom} a été annulée. Nouveau solde: ${receiverAccount.solde}`,
                        'ANNULATION_RECUE',
                        /* demande.transaction.receiver.utilisateur.telephone */
                    );
                }
            } else if (nouvelEtat === 'REFUSEE') {
                // Envoyer une notification de refus
                await TransactionService.createNotification(
                    demande.transaction.sender.utilisateur._id,
                    `Votre demande d'annulation a été refusée.`,
                    'ANNULATION_REFUSEE',
                   /*  demande.transaction.sender.utilisateur.telephone */
                );
            }

            // Mettre à jour l'état de la demande
            demande.etat = nouvelEtat;
            await demande.save({ session });

            await session.commitTransaction();

            return {
                success: true,
                message: `Demande d'annulation ${nouvelEtat.toLowerCase()} avec succès`
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
}

export default DemandeAnnulationService;