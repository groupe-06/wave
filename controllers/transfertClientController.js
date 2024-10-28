import Transaction from "../models/transaction.js";
import TypeTransaction from "../models/typeTransaction.js";
import Compte from '../models/compte.js';
import Utilisateur from '../models/utilisateur.js';
import DemandeAnnulation from '../models/demandeAnnulation.js';
import mongoose from 'mongoose';




export const transactionClient = async (req, res) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const userId = req.userId;
        const { receiverId, montant } = req.body;

        if (!userId) {
            throw new Error("User non connecté");
        }

        const user = await Utilisateur.findById(userId).session(session);
        if (!user || (user.role!== 'CLIENT' && user.role!== 'AGENT')) {
            throw new Error("Accès non autorisé");
        }
        
        if (!Number.isInteger(montant) || montant <= 0) {
            throw new Error("Montant doit être un entier positif");
        }
        
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            throw new Error("Id du destinataire invalide");
        }
        
        if (!receiverId ||!montant) {
            throw new Error("Id du destinataire et le montant obligatoires");
        }
        
        const senderAccount = await Compte.findOne({ utilisateur: userId }).session(session);
        if (!senderAccount) {
            throw new Error("Compte expéditeur non trouvé");
        }

        const receiverAccount = await Compte.findById(receiverId).session(session);
        if (!receiverAccount) {
            throw new Error("Compte destinataire non trouvé");
        }

        if (senderAccount.solde < montant) {
            throw new Error("Solde insuffisant");
        }

        const typeTransfert = await TypeTransaction.findOne({ nom: "transfert" });
        if (!typeTransfert) {
            throw new Error("Type de transaction 'TRANSFERT' non trouvé");
        }

        const fraisTransaction = typeTransfert.frais;
        const montantTotal = montant + fraisTransaction;        

        if (senderAccount.solde < montantTotal) {
            throw new Error("Solde insuffisant pour couvrir les frais de transaction");
        }

        if (senderAccount.soldeMaximum && senderAccount.soldeMaximum < senderAccount.solde) {
            throw new Error("Solde dépassant le solde maximum");
        }

        // Mise à jour des compteurs
        // senderAccount.cummulTransactionMensuelle += montant;
        // receiverAccount.cummulTransactionMensuelle += montant;


    
        const transaction = new Transaction({
            receiver: receiverId,
            sender: senderAccount._id,
            montant: montant,
            etat: 'SUCCES',
            TypeTransaction: typeTransfert._id
        });

        senderAccount.solde -= montantTotal;
        receiverAccount.solde += montant;

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
                    .populate('sender', 'solde')
                    .populate('receiver', 'solde')
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

export const getAllTransactionsClients = async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            throw new Error("User non connecté");
        }

        const user = await Utilisateur.findById(userId);
        if (!user || (user.role!== 'CLIENT' && user.role!== 'AGENT')) {
            throw new Error("Accès non autorisé");
        }

        const compte = await Compte.findOne({ utilisateur: userId });
        if (!compte) {
            throw new Error("Compte non trouvé");
        }
        
        const transactions = await Transaction.find( {
            $or: [
                { sender: compte._id },    
                { receiver: compte._id }  
            ]
        } )
        .populate('receiver', 'solde')
        .populate('sender', 'solde')
        .populate('TypeTransaction')
        .sort({ date: -1 });
        console.log(transactions);

        res.status(200).json({ transactions });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
    }
}

export const annulerTransaction = async (req, res) => {

    try {

        const userId = req.userId;
        const { idTrans } = req.body;
        const { motif } = req.body;
        
        const transaction = await Transaction.findById(idTrans);

        if (!transaction) {
            throw new Error("Transaction non trouvée");
        }

        const user = await Utilisateur.findById(userId);


        if (!user) {
            throw new Error("Accès non autorisé");
        }

        if(!user.role === 'CLIENT') {
            throw new Error("Seul le Client peut faire une demande d'annulation");
        }

        const demande = await DemandeAnnulation.findOne({
            transaction: transaction._id,
            etat: 'EN_ATTENTE'
        });

        if (demande) {
            throw new Error("Une demande d'annulation existe déjà pour cette transaction.");
        }
        const demandeAnnulation = new DemandeAnnulation({
            transaction: transaction._id,
            utilisateur: user._id,
            motif: motif,
            etat: 'EN_ATTENTE',
        }); 

        await demandeAnnulation.save();

        return res.status(200).json({
            message: "La demande d'annulation a été soumise à l'administrateur."
        });
            
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
    }
}


