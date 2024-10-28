import Transaction from "../models/transaction.js";
import TypeTransaction from "../models/typeTransaction.js";
import Compte from '../models/compte.js';
import Utilisateur from '../models/utilisateur.js';
import DemandeAnnulation from '../models/demandeAnnulation.js';
import mongoose from 'mongoose';

export const confirmerAnnulationTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {

        const userId = req.userId;
        const { idDemande } = req.body;

        const user = await Utilisateur.findById(userId);

        if (!user || (user.role!== 'ADMIN')) {
            return res.status(403).json({ message: 'Accès interdit : administrateur requis' });
        }

        const demandeAnnulation = await DemandeAnnulation.findById(idDemande).populate('transaction');

        if (!demandeAnnulation) {
            throw new Error("Demande d'annulation non trouvée");
        }

        if (demandeAnnulation.etat !== 'EN_ATTENTE') {
            throw new Error("La demande d'annulation a déjà été traitée");
        }

        const transaction = await Transaction.findById(demandeAnnulation.transaction._id).session(session);
        if (!transaction) {
            throw new Error("Transaction non trouvée");
        }

        const senderAccount = await Compte.findById(transaction.sender).session(session);
        const receiverAccount = await Compte.findById(transaction.receiver).session(session);
        console.log(receiverAccount);
        res.end();

        if (!senderAccount || !receiverAccount) {
            throw new Error("Compte expéditeur ou destinataire non trouvé");
        }

        senderAccount.solde += transaction.montant ;
        receiverAccount.solde -= transaction.montant;


        if (receiverAccount.solde < 0) {
            throw new Error("Le solde du compte destinataire ne peut pas être négatif après l'annulation");
        }

        await senderAccount.save({ session });
        await receiverAccount.save({ session });

        demandeAnnulation.etat = 'CONFIRMÉE';
        demandeAnnulation.transaction.etat = 'ANNULER';

        await demandeAnnulation.save({ session });
        await demandeAnnulation.transaction.save({ session });
        
        await session.commitTransaction();

        return res.status(200).json({
            message: "La demande d'annulation a été confirmée.",
            demandeAnnulation,
            transaction: demandeAnnulation.transaction
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
    }finally {
        session.endSession();
    }
};
