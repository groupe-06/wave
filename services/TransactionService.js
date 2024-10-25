import mongoose from 'mongoose';
import Utilisateur from '../models/utilisateur.js';
import Compte from '../models/compte.js';
import Transaction from '../models/transaction.js';
import TypeTransaction from '../models/typeTransaction.js';

class TransactionService {
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
            
            let montantFrais = 0; // Initialisation par défaut
            
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
                    
                    // Calcul des frais (1% du montant)
                    const tauxFrais = 0.01; // 1%
                    montantFrais = Math.round(montant * tauxFrais);

                    // Si frais = true, vérifier si le sender a assez pour montant + frais
                    if (frais) {
                        const totalADebiter = montant + montantFrais;
                        if (senderAccount.solde < totalADebiter) {
                            throw new Error(`Solde insuffisant. Vous avez ${senderAccount.solde} mais il faut ${totalADebiter} (montant: ${montant} + frais: ${montantFrais})`);
                        }
                        
                        // Débiter le sender (montant + frais)
                        senderAccount.solde -= totalADebiter;
                        // Créditer le receiver (montant complet)
                        receiverAccount.solde += montant;
                    } 
                    // Si frais = false, vérifier si le sender a assez pour le montant
                    else {
                        if (senderAccount.solde < montant) {
                            throw new Error(`Solde insuffisant. Vous avez ${senderAccount.solde} mais il faut ${montant}`);
                        }
                        
                        // Débiter le sender (montant uniquement)
                        senderAccount.solde -= montant;
                        // Créditer le receiver (montant - frais)
                        receiverAccount.solde += (montant - montantFrais);
                    }
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
            
            // Retourner le résultat avec les détails
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