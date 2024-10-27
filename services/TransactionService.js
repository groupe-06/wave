import mongoose from 'mongoose';
import Utilisateur from '../models/utilisateur.js';
import Compte from '../models/compte.js';
import Transaction from '../models/transaction.js';
import TypeTransaction from '../models/typeTransaction.js';
import Notification from '../models/notification.js';
import  SmsService from  '../services/SmsService.js'
class TransactionService {
    static async createNotification(userId, message, type, phoneNumber = null) {
        try {
            // Créer la notification dans la base de données
            const notification = new Notification({
                compte: userId,
                message,
                type,
                etat: false,
                date: new Date()
            });
            await notification.save();

            // Si un numéro de téléphone est fourni, on envoie un SMS
            if (phoneNumber) {
                try {
                    await SmsService.sendSms(phoneNumber, message);
                    console.log(`SMS envoyé avec succès à ${phoneNumber}`);
                } catch (error) {
                    console.error('Erreur lors de l\'envoi du SMS:', error);
                    // On ne relance pas l'erreur pour ne pas bloquer la transaction
                }
            }

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
            const { montant, sender_id, recever_id, transaction, frais = null } = data;

            // Vérification du montant
            if (!Number.isInteger(montant)) {
                throw new Error("Le montant doit être un nombre entier");
            }
            
            if (montant <= 0) {
                throw new Error("Le montant doit être un nombre positif");
            }
            
            let montantFrais = 0;
            
            // Vérifications des utilisateurs
            const sender = await Utilisateur.findById(sender_id);
            const receiver = await Utilisateur.findById(recever_id);
            const connectedUser = await Utilisateur.findById(userId);
            
            if (!sender || !receiver) {
                throw new Error("Utilisateur(s) non trouvé(s)");
            }

            // Récupération des comptes
            const senderAccount = await Compte.findOne({ utilisateur: sender_id, etat: 'ACTIF' });
            const receiverAccount = await Compte.findOne({ utilisateur: recever_id, etat: 'ACTIF' });

            if (!senderAccount || !receiverAccount) {
                throw new Error("Compte(s) non trouvé(s) ou inactif(s)");
            }

            // Récupérer le type de transaction
            const typeTransaction = await TypeTransaction.findOne({ nom: transaction.toLowerCase() });
            if (!typeTransaction) {
                throw new Error("Type de transaction invalide");
            }

            switch (transaction.toLowerCase()) {
                case 'transfert':
                    // Vérifier que l'utilisateur connecté est le sender
                    if (connectedUser._id.toString() !== sender._id.toString()) {
                        throw new Error("Seul l'expéditeur peut effectuer le transfert");
                    }
                    
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
                        sender_id,
                        `Vous avez envoyé ${montant} à ${receiver.prenom} ${receiver.nom}. Nouveau solde: ${senderAccount.solde}`,
                        'TRANSFERT_ENVOYE',
                        sender.telephone // Ajout du numéro de téléphone
                    );
                    await this.createNotification(
                        recever_id,
                        `Vous avez reçu ${frais ? montant : montant - montantFrais} de ${sender.prenom} ${sender.nom}. Nouveau solde: ${receiverAccount.solde}`,
                        'TRANSFERT_RECU',
                        receiver.telephone // Ajout du numéro de téléphone
                    );
                    break;

                case 'depot':
                    if (sender.role !== 'AGENT') {
                        throw new Error("L'expéditeur doit être un agent pour un dépôt");
                    }
                    if (connectedUser._id.toString() !== sender._id.toString()) {
                        throw new Error("Seul l'agent peut effectuer le dépôt");
                    }
                    
                    if (senderAccount.solde < montant) {
                        throw new Error("Solde insuffisant");
                    }

                    senderAccount.solde -= montant;
                    receiverAccount.solde += montant;

                    // Notification pour le dépôt
                    await this.createNotification(
                        recever_id,
                        `Vous avez reçu un dépôt de ${montant}. Nouveau solde: ${receiverAccount.solde}`,
                        'DEPOT',
                        receiver.telephone // Ajout du numéro de téléphone
                    );
                    break;

                case 'retrait':
                    if (receiver.role !== 'AGENT') {
                        throw new Error("Le destinataire doit être un agent pour un retrait");
                    }
                    if (connectedUser._id.toString() !== receiver._id.toString()) {
                        throw new Error("Seul l'agent peut effectuer le retrait");
                    }
                    
                    if (senderAccount.solde < montant) {
                        throw new Error("Solde insuffisant");
                    }

                    senderAccount.solde -= montant;
                    receiverAccount.solde += montant;

                    // Notification pour le retrait
                    await this.createNotification(
                        sender_id,
                        `Vous avez effectué un retrait de ${montant}. Nouveau solde: ${senderAccount.solde}`,
                        'RETRAIT',
                        sender.telephone // Ajout du numéro de téléphone
                    );
                    break;

                default:
                    throw new Error("Type de transaction non supporté");
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

            // Commit de la transaction
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
                'TRANSFERT_ANNULE'
            );

            await this.createNotification(
                receiverAccount.utilisateur._id,
                `Annulation du transfert de ${transaction.montant} reçu de ${senderAccount.utilisateur.prenom} ${senderAccount.utilisateur.nom}. Nouveau solde: ${receiverAccount.solde}`,
                'TRANSFERT_ANNULE'
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