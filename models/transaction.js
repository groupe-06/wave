import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid'

const transactionSchema = new mongoose.Schema({
    receiver: {type: mongoose.Schema.Types.ObjectId, ref: 'Compte', required: true},
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'Compte', required: true},
    montant: {type: Number, required: true},
    date: {type: Date, default: Date.now},
    etat: {type: String, enum: ['SUCCES', 'ECHEC', 'ANNULER'], required: true},
    TypeTransaction: {type: mongoose.Schema.Types.ObjectId, ref: 'TypeTransaction', required: true},
    transactionId: {type: String, default: uuidv4, unique: true} // Ajout d'un identifiant unique
});

const Transaction = mongoose.model('Transaction', transactionSchema);    

export default Transaction;
