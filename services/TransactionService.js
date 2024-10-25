import mongoose from 'mongoose';
import Utilisateur from '../models/utilisateur.js';
import Compte from '../models/compte.js';
import Transaction from '../models/transaction.js';
import TypeTransaction from '../models/typeTransaction.js';
import Notification from '../models/notification.js';

class TransactionService {
    static async createNotification(userId, message, type) {
        const notification = new Notification({
            compte: userId,
            message,
            type,
            etat: false,
            date: new Date()
        });
        await notification.save();
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
                        'TRANSFERT_ENVOYE'
                    );
                    await this.createNotification(
                        recever_id,
                        `Vous avez reçu ${frais ? montant : montant - montantFrais} de ${sender.prenom} ${sender.nom}. Nouveau solde: ${receiverAccount.solde}`,
                        'TRANSFERT_RECU'
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
                        'DEPOT'
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
                        'RETRAIT'
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
}

export default TransactionService;