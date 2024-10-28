import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    receiver: {type: mongoose.Schema.Types.ObjectId, ref: 'Compte', required: true},
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'Compte', required: true},
    montant: {type: Number, required: true},
    date: {type: Date, default: Date.now},
    etat: {type: String, enum: ['SUCCES', 'ECHEC', 'ANNULER'], required: true},
    TypeTransaction: {type: mongoose.Schema.Types.ObjectId, ref: 'TypeTransaction', required: true},
});

const Transaction = mongoose.model('Transaction', transactionSchema);    

export default Transaction;
