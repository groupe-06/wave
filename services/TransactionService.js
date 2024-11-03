import mongoose from 'mongoose';
import Utilisateur from '../models/utilisateur.js';
import Compte from '../models/compte.js';
import Transaction from '../models/transaction.js';
import TypeTransaction from '../models/typeTransaction.js';
import Notification from '../models/notification.js';
import WebSocketService from '../services/WebSocketService.js';
import { getUserIdByPhone } from '../controllers/utilisateurController.js';
import sendSMS from '../utils/sendSms.js';
import ScheduledTransaction from '../models/scheduledTransaction.js';
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

          /*   await sendSMS(telephoneNumber, message); */

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

            if (!Number.isInteger(montant)) {
                throw new Error("Le montant doit être un nombre entier");
            }

            if (montant <= 0) {
                throw new Error("Le montant doit être un nombre positif");
            }

            let montantFrais = 0;
            let senderId, receiverId;
            const connectedUser = await Utilisateur.findById(userId);

            switch (transaction.toLowerCase()) {
                case 'transfert':
                    senderId = userId;
                    receiverId = await getUserIdByPhone(recever_telephone);
                    if (senderId.toString() === receiverId.toString()) {
                        throw new Error("Vous ne pouvez pas faire de transaction à vous-même");
                    }
                    break;

                case 'payement':
                    senderId = userId;
                    receiverId = await getUserIdByPhone(recever_telephone);
                    // Vérifier si le destinataire est un marchand
                    const receiverUser = await Utilisateur.findById(receiverId);
                    if (!receiverUser || receiverUser.role !== 'MARCHAND') {
                        throw new Error("Le destinataire doit être un marchand pour recevoir un paiement");
                    }
                    if (senderId.toString() === receiverId.toString()) {
                        throw new Error("Vous ne pouvez pas faire de paiement à vous-même");
                    }
                    break;

                case 'depot':
                    if (connectedUser.role !== 'AGENT' && connectedUser.role !== 'ADMIN') {
                        throw new Error("Seuls les agents et les administrateurs peuvent effectuer un dépôt");
                    }
                    senderId = userId;
                    receiverId = await getUserIdByPhone(recever_telephone);
                    if (senderId.toString() === receiverId.toString()) {
                        throw new Error("Vous ne pouvez pas faire de dépôt à vous-même");
                    }
                    break;

                case 'retrait':
                    senderId = await getUserIdByPhone(sender_telephone);
                    receiverId = userId;
                    if (connectedUser.role !== 'AGENT' && connectedUser.role !== 'ADMIN') {
                        throw new Error("Seuls les agents et les administrateurs peuvent effectuer un retrait");
                    }
                    if (senderId.toString() === receiverId.toString()) {
                        throw new Error("Vous ne pouvez pas faire de retrait à vous-même");
                    }
                    break;

                default:
                    throw new Error("Type de transaction non supporté");
            }

            const senderAccount = await Compte.findOne({ utilisateur: senderId, etat: 'ACTIF' }).populate('utilisateur');
            const receiverAccount = await Compte.findOne({ utilisateur: receiverId, etat: 'ACTIF' }).populate('utilisateur');

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

                    await this.createNotification(
                        senderId,
                        `Vous avez envoyé ${montant} à ${receiverAccount.utilisateur.prenom} ${receiverAccount.utilisateur.nom}. Nouveau solde: ${senderAccount.solde}`,
                        'TRANSFERT_ENVOYE'
                    );
                    await this.createNotification(
                        receiverId,
                        `Vous avez reçu ${frais ? montant : montant - montantFrais} de ${senderAccount.utilisateur.prenom} ${senderAccount.utilisateur.nom}. Nouveau solde: ${receiverAccount.solde}`,
                        'TRANSFERT_RECU'
                    );
                    break;

                case 'payement':
                    if (senderAccount.solde < montant) {
                        throw new Error(`Solde insuffisant. Vous avez ${senderAccount.solde} mais il faut ${montant}`);
                    }

                    senderAccount.solde -= montant;
                    receiverAccount.solde += montant;

                    await this.createNotification(
                        senderId,
                        `Vous avez effectué un paiement de ${montant} à ${receiverAccount.utilisateur.prenom} ${receiverAccount.utilisateur.nom}. Nouveau solde: ${senderAccount.solde}`,
                        'PAYMENT_ENVOYE'
                    );
                    await this.createNotification(
                        receiverId,
                        `Vous avez reçu un paiement de ${montant} de ${senderAccount.utilisateur.prenom} ${senderAccount.utilisateur.nom}. Nouveau solde: ${receiverAccount.solde}`,
                        'PAYMENT_RECU'
                    );
                    break;

                case 'depot':
                    if (senderAccount.solde < montant) {
                        throw new Error("Solde insuffisant");
                    }

                    senderAccount.solde -= montant;
                    receiverAccount.solde += montant;

                    await this.createNotification(
                        receiverId,
                        `Vous avez reçu un dépôt de ${montant}. Nouveau solde: ${receiverAccount.solde}`,
                        'DEPOT'
                    );
                    break;

                case 'retrait':
                    if (senderAccount.solde < montant) {
                        throw new Error("Solde insuffisant");
                    }

                    senderAccount.solde -= montant;
                    receiverAccount.solde += montant;

                    await this.createNotification(
                        senderId,
                        `Vous avez effectué un retrait de ${montant}. Nouveau solde: ${senderAccount.solde}`,
                        'RETRAIT'
                    );
                    break;
            }

            await senderAccount.save({ session });
            await receiverAccount.save({ session });

            const newTransaction = new Transaction({
                receiver: receiverAccount._id,
                sender: senderAccount._id,
                montant,
                etat: 'SUCCES',
                TypeTransaction: typeTransaction._id,
                fraisInclus: transaction.toLowerCase() === 'payment' ? false : frais,
                montantFrais
            });
            await newTransaction.save({ session });

            await session.commitTransaction();

            return {
                success: true,
                message: "Transaction effectuée avec succès",
                transaction: newTransaction,
                details: {
                    soldeInitialSender: senderAccount.solde + (transaction.toLowerCase() === 'payment' ? montant : (frais ? montant + montantFrais : montant)),
                    soldeFinalSender: senderAccount.solde,
                    soldeInitialReceiver: receiverAccount.solde - (transaction.toLowerCase() === 'payment' ? montant : (frais ? montant : montant - montantFrais)),
                    soldeFinalReceiver: receiverAccount.solde,
                    montantFrais,
                    fraisPayesPar: transaction.toLowerCase() === 'payment' ? "aucun" : (frais ? "sender" : "receiver")
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
              /*   senderAccount.utilisateur.telephone */
            );

            await this.createNotification(
                receiverAccount.utilisateur._id,
                `Annulation du transfert de ${transaction.montant} reçu de ${senderAccount.utilisateur.prenom} ${senderAccount.utilisateur.nom}. Nouveau solde: ${receiverAccount.solde}`,
                'TRANSFERT_ANNULE',
                /* receiverAccount.utilisateur.telephone */
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
    static async getUserSuccessfulTransfers(userId) {
        try {
            // Recherche des transactions où le sender est l'utilisateur, le type est "transfert" et l'état est "SUCCES"
            const transactions = await Transaction.find({
                sender: userId,
                TypeTransaction: await TypeTransaction.findOne({ nom: 'transfert' }).select('_id'),
                etat: 'SUCCES'
            }).populate('receiver', 'prenom nom').populate('TypeTransaction', 'nom');

            return transactions;
        } catch (error) {
            console.error('Erreur lors de la récupération des transactions:', error);
            throw error;
        }
    }
    static async executeMassTransaction(data, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();
    
        try {
            const { montant, receiver_ids, transaction, frais = null } = data;
            
            // Validations de base
            if (!Array.isArray(receiver_ids) || receiver_ids.length === 0) {
                throw new Error("La liste des destinataires est requise et ne peut pas être vide");
            }
            
            if (!Number.isInteger(montant)) {
                throw new Error("Le montant doit être un nombre entier");
            }
    
            if (montant <= 0) {
                throw new Error("Le montant doit être un nombre positif");
            }
    
            // Récupérer le compte émetteur
            const senderAccount = await Compte.findOne({ 
                utilisateur: userId, 
                etat: 'ACTIF' 
            }).populate('utilisateur');
    
            if (!senderAccount) {
                throw new Error("Compte émetteur non trouvé ou inactif");
            }
    
            // Calculer le montant total nécessaire
            const tauxFrais = 0.01;
            const montantFraisParTransaction = Math.round(montant * tauxFrais);
            const montantTotalFrais = montantFraisParTransaction * receiver_ids.length;
            const montantTotalNecessaire = (montant * receiver_ids.length) + 
                (frais ? montantTotalFrais : 0);
    
            // Vérification stricte du solde
            if (senderAccount.solde < montantTotalNecessaire) {
                throw new Error(`Solde insuffisant. Vous avez ${senderAccount.solde} mais il faut ${montantTotalNecessaire} pour effectuer tous les transferts`);
            }
    
            const transactions = [];
            const typeTransaction = await TypeTransaction.findOne({ 
                nom: transaction.toLowerCase() 
            });
    
            // Exécuter chaque transfert
            for (const receiverId of receiver_ids) {
                // Vérifier que ce n'est pas un transfert à soi-même
                if (userId.toString() === receiverId.toString()) {
                    continue;
                }
    
                const receiverAccount = await Compte.findOne({ 
                    utilisateur: receiverId, 
                    etat: 'ACTIF' 
                }).populate('utilisateur');
    
                if (!receiverAccount) {
                    continue; // Passer au destinataire suivant si le compte n'est pas trouvé
                }
    
                // Mettre à jour les soldes
                if (frais) {
                    senderAccount.solde -= (montant + montantFraisParTransaction);
                    receiverAccount.solde += montant;
                } else {
                    senderAccount.solde -= montant;
                    receiverAccount.solde += (montant - montantFraisParTransaction);
                }
    
                await receiverAccount.save({ session });
    
                // Créer la transaction
                const newTransaction = new Transaction({
                    receiver: receiverAccount._id,
                    sender: senderAccount._id,
                    montant,
                    etat: 'SUCCES',
                    TypeTransaction: typeTransaction._id,
                    fraisInclus: frais,
                    montantFrais: montantFraisParTransaction
                });
                
                await newTransaction.save({ session });
                transactions.push(newTransaction);
    
                // Créer les notifications
                await this.createNotification(
                    userId,
                    `Vous avez envoyé ${montant} à ${receiverAccount.utilisateur.prenom} ${receiverAccount.utilisateur.nom}`,
                    'TRANSFERT_ENVOYE'
                );
                
                await this.createNotification(
                    receiverId,
                    `Vous avez reçu ${frais ? montant : montant - montantFraisParTransaction} de ${senderAccount.utilisateur.prenom} ${senderAccount.utilisateur.nom}`,
                    'TRANSFERT_RECU'
                );
            }
    
            await senderAccount.save({ session });
            await session.commitTransaction();
    
            return {
                success: true,
                message: `${transactions.length} transferts effectués avec succès`,
                transactions,
                details: {
                    soldeInitial: senderAccount.solde + montantTotalNecessaire,
                    soldeFinal: senderAccount.solde,
                    montantTotalFrais,
                    fraisPayesPar: frais ? "sender" : "receiver",
                    transfertsReussis: transactions.length,
                    transfertsPrevus: receiver_ids.length
                }
            };
    
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    static async scheduleTransaction(data, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();
    
        try {
            const { 
                receiver_ids, 
                montant, 
                dateExecution, 
                recurring = false, 
                frequence,
                frais = false 
            } = data;
    
            // Validations
            if (new Date(dateExecution) < new Date()) {
                throw new Error("La date d'exécution doit être dans le futur");
            }
    
            if (recurring && !['DAILY', 'WEEKLY', 'MONTHLY'].includes(frequence)) {
                throw new Error("Fréquence de récurrence invalide");
            }
    
            // Vérifier le solde actuel
            const senderAccount = await Compte.findOne({ 
                utilisateur: userId, 
                etat: 'ACTIF' 
            });
    
            if (!senderAccount) {
                throw new Error("Compte émetteur non trouvé ou inactif");
            }
    
            // Calculer le montant total nécessaire
            const tauxFrais = 0.01;
            const montantFraisParTransaction = Math.round(montant * tauxFrais);
            const montantTotalFrais = montantFraisParTransaction * receiver_ids.length;
            const montantTotalNecessaire = (montant * receiver_ids.length) + 
                (frais ? montantTotalFrais : 0);
    
            // Vérifier si le solde est suffisant
            if (senderAccount.solde < montantTotalNecessaire) {
                throw new Error(`Solde insuffisant pour programmer ce transfert. Vous avez ${senderAccount.solde} mais il faut ${montantTotalNecessaire}`);
            }
    
            // Créer le transfert programmé
            const scheduledTransaction = new ScheduledTransaction({
                sender: userId,
                receiver_ids,
                montant,
                dateExecution,
                recurring,
                frequence,
                frais,
                statut: 'PENDING',
                derniereSoldeVerification: senderAccount.solde
            });
    
            await scheduledTransaction.save({ session });
            await session.commitTransaction();
    
            return {
                success: true,
                message: "Transfert programmé avec succès",
                scheduledTransaction
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    // Fonction pour exécuter les transferts programmés
    static async executeScheduledTransactions() {
        const session = await mongoose.startSession();
        session.startTransaction();
    
        try {
            // Récupérer tous les transferts programmés en attente
            const now = new Date();
            const pendingTransactions = await ScheduledTransaction.find({
                statut: 'PENDING',
                dateExecution: { $lte: now }
            });
    
            for (const scheduledTx of pendingTransactions) {
                try {
                    // Vérifier à nouveau le solde avant l'exécution
                    const senderAccount = await Compte.findOne({ 
                        utilisateur: scheduledTx.sender, 
                        etat: 'ACTIF' 
                    });
    
                    const tauxFrais = 0.01;
                    const montantFraisParTransaction = Math.round(scheduledTx.montant * tauxFrais);
                    const montantTotalFrais = montantFraisParTransaction * scheduledTx.receiver_ids.length;
                    const montantTotalNecessaire = (scheduledTx.montant * scheduledTx.receiver_ids.length) + 
                        (scheduledTx.frais ? montantTotalFrais : 0);
    
                    if (!senderAccount || senderAccount.solde < montantTotalNecessaire) {
                        scheduledTx.statut = 'FAILED';
                        await scheduledTx.save({ session });
                        continue;
                    }
    
                    // Exécuter le transfert en masse
                    await this.executeMassTransaction({
                        montant: scheduledTx.montant,
                        receiver_ids: scheduledTx.receiver_ids,
                        transaction: 'transfert',
                        frais: scheduledTx.frais
                    }, scheduledTx.sender);
    
                    scheduledTx.statut = 'EXECUTED';
    
                    // Si récurrent, programmer le prochain transfert
                    if (scheduledTx.recurring) {
                        const nextDate = new Date(scheduledTx.dateExecution);
                        switch (scheduledTx.frequence) {
                            case 'DAILY':
                                nextDate.setDate(nextDate.getDate() + 1);
                                break;
                            case 'WEEKLY':
                                nextDate.setDate(nextDate.getDate() + 7);
                                break;
                            case 'MONTHLY':
                                nextDate.setMonth(nextDate.getMonth() + 1);
                                break;
                        }
    
                        const newScheduledTx = new ScheduledTransaction({
                            sender: scheduledTx.sender,
                            receiver_ids: scheduledTx.receiver_ids,
                            montant: scheduledTx.montant,
                            dateExecution: nextDate,
                            recurring: scheduledTx.recurring,
                            frequence: scheduledTx.frequence,
                            frais: scheduledTx.frais,
                            statut: 'PENDING',
                            derniereSoldeVerification: senderAccount.solde
                        });
                        await newScheduledTx.save({ session });
                    }
                } catch (error) {
                    scheduledTx.statut = 'FAILED';
                    // Envoyer une notification à l'utilisateur pour l'échec
                    await this.createNotification(
                        scheduledTx.sender,
                        `Le transfert programmé de ${scheduledTx.montant} a échoué: ${error.message}`,
                        'TRANSFERT_PROGRAMME_ECHEC'
                    );
                }
    
                await scheduledTx.save({ session });
            }
    
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
        }
}

export default TransactionService;