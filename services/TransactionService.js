import mongoose from 'mongoose';
import Utilisateur from '../models/utilisateur.js';
import Compte from '../models/compte.js';
import Transaction from '../models/transaction.js';
import TypeTransaction from '../models/typeTransaction.js';
import Notification from '../models/notification.js';
import WebSocketService from '../services/WebSocketService.js';
import { getUserIdByPhone } from '../controllers/utilisateurController.js';
import sendSMS from '../utils/sendSms.js';
class TransactionService {
    static async createNotification(userId, message, type, telephoneNumber) {
        try {
            const notification = new Notification({
                compte: userId,
                message,
                type,
                etat: false,
                date: new Date()
            });
            await notification.save();

            const io = WebSocketService.getInstance();
            if (io) {
                io.to(`user-${userId}`).emit('new-notification', {
                    notification,
                    message: 'Nouvelle notification reçue'
                });
            }

            await sendSMS(telephoneNumber, message);

            return notification;
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
            throw error;
        }
    }

    static async executeTransaction(data, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { montant, sender_telephone, recever_telephone, transaction, frais = null } = data;

            // Vérification du montant
            if (!Number.isInteger(montant)) {
                throw new Error("Le montant doit être un nombre entier");
            }

            if (montant <= 0) {
                throw new Error("Le montant doit être un nombre positif");
            }

            let montantFrais = 0;
            let senderId, receiverId;
            const connectedUser = await Utilisateur.findById(userId);
           /*  if (senderId ===receiverId) {
                throw new Error("vous ne pouvez pas faire de transaction à vous même ");
            } */
            switch (transaction.toLowerCase()) {
                case 'transfert':
                    // Le sender est l'utilisateur connecté
                    senderId = userId;
                    // Récupérer le ID du receiver à partir du numéro de téléphone
                    receiverId = await getUserIdByPhone(recever_telephone);
                    if (senderId.toString() === receiverId.toString()) {
                        throw new Error("Vous ne pouvez pas faire de transaction à vous-même");
                    }
                    break;

                case 'depot':
                    // Le sender est l'utilisateur connecté et doit être AGENT ou ADMIN
                    const connectedUser = await Utilisateur.findById(userId);
                    if (connectedUser.role !== 'AGENT' && connectedUser.role !== 'ADMIN') {
                        throw new Error("Seuls les agents et les administrateurs peuvent effectuer un dépôt");
                    }
                    senderId = userId;
                    // Récupérer le ID du receiver à partir du numéro de téléphone
                    receiverId = await getUserIdByPhone(recever_telephone);
                    if (senderId.toString() === receiverId.toString()) {
                        throw new Error("Vous ne pouvez pas faire de dépôt à vous-même");
                    }
                    break;

                case 'retrait':
                    // Récupérer le ID du sender à partir du numéro de téléphone
                    senderId = await getUserIdByPhone(sender_telephone);
                    // Le receiver est l'utilisateur connecté et doit être AGENT ou ADMIN
                    receiverId = userId;
                    const receiver = await Utilisateur.findById(receiverId);
                    if (receiver.role !== 'AGENT' && receiver.role !== 'ADMIN') {
                        throw new Error("Seuls les agents et les administrateurs peuvent effectuer un retrait");
                    }
                    if (senderId.toString() === receiverId.toString()) {
                        throw new Error("Vous ne pouvez pas faire de retrait à vous-même");
                    }
                    break;

                default:
                    throw new Error("Type de transaction non supporté");
            }

            // Récupération des comptes
            const senderAccount = await Compte.findOne({ utilisateur: senderId, etat: 'ACTIF' }).populate('utilisateur');
            const receiverAccount = await Compte.findOne({ utilisateur: receiverId, etat: 'ACTIF' }).populate('utilisateur');

            // Récupérer le type de transaction
            const typeTransaction = await TypeTransaction.findOne({ nom: transaction.toLowerCase() });
            if (!typeTransaction) {
                throw new Error("Type de transaction invalide");
            }

            switch (transaction.toLowerCase()) {
                case 'transfert':
                    const tauxFrais = 0.01;
                    montantFrais = Math.round(montant * tauxFrais);

                    if (frais) {
                        const totalADebiter = montant + montantFrais;
                        if (senderAccount.solde < totalADebiter) {
                            throw new Error(`Solde insuffisant. Vous avez ${senderAccount.solde} mais il faut ${totalADebiter}`);
                        }

                        senderAccount.solde -= totalADebiter;
                        receiverAccount.solde += montant;
                    } else {
                        if (senderAccount.solde < montant) {
                            throw new Error(`Solde insuffisant. Vous avez ${senderAccount.solde} mais il faut ${montant}`);
                        }

                        senderAccount.solde -= montant;
                        receiverAccount.solde += (montant - montantFrais);
                    }

                    // Notifications pour le transfert
                    await this.createNotification(
                        senderId,
                        `Vous avez envoyé ${montant} à ${receiverAccount.utilisateur.prenom} ${receiverAccount.utilisateur.nom}. Nouveau solde: ${senderAccount.solde}`,
                        'TRANSFERT_ENVOYE',
                        senderAccount.utilisateur.telephone
                    );
                    await this.createNotification(
                        receiverId,
                        `Vous avez reçu ${frais ? montant : montant - montantFrais} de ${senderAccount.utilisateur.prenom} ${senderAccount.utilisateur.nom}. Nouveau solde: ${receiverAccount.solde}`,
                        'TRANSFERT_RECU',
                        receiverAccount.utilisateur.telephone
                    );
                    break;

                case 'depot':
                    if (senderAccount.solde < montant) {
                        throw new Error("Solde insuffisant");
                    }

                    senderAccount.solde -= montant;
                    receiverAccount.solde += montant;

                    // Notification pour le dépôt
                    await this.createNotification(
                        receiverId,
                        `Vous avez reçu un dépôt de ${montant}. Nouveau solde: ${receiverAccount.solde}`,
                        'DEPOT',
                        receiverAccount.utilisateur.telephone
                    );
                    break;

                case 'retrait':
                    if (senderAccount.solde < montant) {
                        throw new Error("Solde insuffisant");
                    }

                    senderAccount.solde -= montant;
                    receiverAccount.solde += montant;

                    // Notification pour le retrait
                    await this.createNotification(
                        senderId,
                        `Vous avez effectué un retrait de ${montant}. Nouveau solde: ${senderAccount.solde}`,
                        'RETRAIT',
                        senderAccount.utilisateur.telephone
                    );
                    break;
            }

            // Sauvegarder les modifications des comptes
            await senderAccount.save({ session });
            await receiverAccount.save({ session });

            // Créer la transaction
            const newTransaction = new Transaction({
                receiver: receiverAccount._id,
                sender: senderAccount._id,
                montant,
                etat: 'SUCCES',
                TypeTransaction: typeTransaction._id,
                fraisInclus: frais,
                montantFrais
            });
            await newTransaction.save({ session });

            await session.commitTransaction();

            return {
                success: true,
                message: "Transaction effectuée avec succès",
                transaction: newTransaction,
                details: {
                    soldeInitialSender: senderAccount.solde + (frais ? montant + montantFrais : montant),
                    soldeFinalSender: senderAccount.solde,
                    soldeInitialReceiver: receiverAccount.solde - (frais ? montant : montant - montantFrais),
                    soldeFinalReceiver: receiverAccount.solde,
                    montantFrais,
                    fraisPayesPar: frais ? "sender" : "receiver"
                }
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async cancelTransaction(transactionId, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Vérifier que l'utilisateur est ADMIN ou AGENT
            const connectedUser = await Utilisateur.findById(userId);
            if (!connectedUser || (connectedUser.role !== 'ADMIN' && connectedUser.role !== 'AGENT')) {
                throw new Error("Seuls les administrateurs et les agents peuvent annuler une transaction");
            }

            // Récupérer la transaction
            const transaction = await Transaction.findById(transactionId)
                .populate('sender')
                .populate('receiver')
                .populate('TypeTransaction');

            if (!transaction) {
                throw new Error("Transaction non trouvée");
            }

            // Vérifier que c'est un transfert
            if (transaction.TypeTransaction.nom !== 'transfert') {
                throw new Error("Seuls les transferts peuvent être annulés");
            }

            // Vérifier que la transaction n'est pas déjà annulée
            if (transaction.etat === 'ANNULE') {
                throw new Error("Cette transaction a déjà été annulée");
            }

            // Récupérer les comptes
            const receiverAccount = await Compte.findById(transaction.receiver).populate('utilisateur');
            const senderAccount = await Compte.findById(transaction.sender).populate('utilisateur');
            if (!senderAccount || !receiverAccount) {
                throw new Error("Un des comptes n'existe pas ou n'est pas actif");
            }
            // Vérifier si le receiver a assez d'argent pour l'annulation
            if (receiverAccount.solde < transaction.montant) {
                throw new Error("Annulation impossible : solde insuffisant sur le compte destinataire");
            }

            // Calculer le montant à rembourser en prenant en compte les frais
            const montantARembourser = transaction.fraisInclus ?
                transaction.montant + transaction.montantFrais :
                transaction.montant;

            // Effectuer l'annulation
            receiverAccount.solde -= transaction.montant;
            senderAccount.solde += montantARembourser;

            // Mettre à jour la transaction
            transaction.etat = 'ANNULER';
            transaction.dateAnnulation = new Date();
            transaction.annulePar = userId;

            // Sauvegarder les modifications
            await receiverAccount.save({ session });
            await senderAccount.save({ session });
            await transaction.save({ session });

            // Créer les notifications
            await this.createNotification(
                senderAccount.utilisateur._id,
                `Annulation reçue : le transfert de ${transaction.montant} a été annulé. Nouveau solde: ${senderAccount.solde}`,
                'TRANSFERT_ANNULE',
                senderAccount.utilisateur.telephone
            );

            await this.createNotification(
                receiverAccount.utilisateur._id,
                `Annulation du transfert de ${transaction.montant} reçu de ${senderAccount.utilisateur.prenom} ${senderAccount.utilisateur.nom}. Nouveau solde: ${receiverAccount.solde}`,
                'TRANSFERT_ANNULE',
                receiverAccount.utilisateur.telephone
            );

            await session.commitTransaction();

            return {
                success: true,
                message: "Transaction annulée avec succès",
                details: {
                    transactionId: transaction._id,
                    montantRembourse: montantARembourser,
                    nouveauSoldeSender: senderAccount.solde,
                    nouveauSoldeReceiver: receiverAccount.solde
                }
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

export default TransactionService;