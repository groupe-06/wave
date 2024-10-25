import Transaction from "../models/transaction.js";
import TypeTransaction from "../models/transaction.js";
import Compte from '../models/compte.js';
import mongoose from 'mongoose';




export const transactionClient = async (req, res) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const userId = req.userId;
        const { receiverId, montant } = req.body;

        // verification du user connecte
        if (!userId) {
            throw new Error("User non connecté");
        }

        // Vérification des droits d'accès
        const user = await Utilisateur.findById(userId).session(session);
        if (!user || (user.role!== 'CLIENT' && user.role!== 'AGENT')) {
            throw new Error("Accès non autorisé");
        }

        if (!Number.isInteger(montant) || montant <= 0) {
            throw new Error("Montant doit être un entier positif");
        }

        // Vérification de l'id du destinataire
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            throw new Error("Id du destinataire invalide");
        }

        if (!receiverId ||!montant) {
            throw new Error("Id du destinataire et le montant obligatoires");
        }

        // Récupération du compte de l'expéditeur à partir de l'userId
        const senderAccount = await Compte.findOne({ user: userId }).session(session);
        if (!senderAccount) {
            throw new Error("Compte expéditeur non trouvé");
        }

        // Récupération du compte destinataire
        const receiverAccount = await Compte.findById(receiverId).session(session);
        if (!receiverAccount) {
            throw new Error("Compte destinataire non trouvé");
        }

        // Vérification du solde
        if (senderAccount.solde < montant) {
            throw new Error("Solde insuffisant");
        }

        // Récupération du type de transaction TRANSFERT
        const typeTransfert = await TypeTransaction.findOne({ nom: "TRANSFERT" });
        if (!typeTransfert) {
            throw new Error("Type de transaction 'TRANSFERT' non trouvé");
        }

        // Calcul des frais
        const fraisTransaction = typeTransfert.frais;
        const montantTotal = montant + fraisTransaction;

        // Vérification du solde avec les frais
        if (senderAccount.solde < montantTotal) {
            throw new Error("Solde insuffisant pour couvrir les frais de transaction");
        }

        // Création de la transaction
        const transaction = new Transaction({
            receiver: receiverId,
            sender: senderAccount._id, // Utilisation de l'ID du compte expéditeur
            montant: montant,
            etat: 'SUCCES',
            TypeTransaction: typeTransfert._id
        });

        // Mise à jour des soldes
        senderAccount.solde -= montantTotal;
        receiverAccount.solde += montant;

        // Sauvegarde des modifications
        await transaction.save({ session });
        await senderAccount.save({ session });
        await receiverAccount.save({ session });

        // Validation de la transaction
        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: "Transfert effectué avec succès",
            data: {
                transaction: await Transaction.findById(transaction._id)
                    .populate('TypeTransaction')
                    .populate('sender', 'numero solde')
                    .populate('receiver', 'numero solde')
            }
        });

        
    }
     catch (error) {
        await session.abortTransaction();
        console.log(error);
        return res.status(500).json({ message: error.message });
    }
    finally {
        session.endSession();
    }
}

// Fonction recuperation de tous ses transations
export const getAllTransactionsClients = async (req, res) => {
    try {
        const userId = req.userId;

        // Verification du user connecte
        if (!userId) {
            throw new Error("User non connecté");
        }

        // Vérification des droits d'accès
        const user = await Utilisateur.findById(userId);
        if (!user || (user.role!== 'CLIENT' && user.role!== 'AGENT')) {
            throw new Error("Accès non autorisé");
        }

        // Récupération de toutes les transactions de l'utilisateur
        const transactions = await Transaction.find({ sender: userId })
           .populate('receiver', 'numero')
           .populate('TypeTransaction', 'nom');

        res.status(200).json({ transactions });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
    }
}
