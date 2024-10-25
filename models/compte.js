import mongoose from "mongoose";

const compteSchema = new mongoose.Schema({
    utilisateur: {type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true},
    solde: {type: Number, default: 0},
    dateCreation: {type: Date, default: Date.now},
    soldeMaximum: Number,
    cummulTransactionMensuelle: Number,
    qrcode: {type: String, required: true},
    etat: {type: String, enum: ['ACTIF', 'INACTIF', 'SUSPENDU'], default: 'ACTIF', required: true}
});

const Compte = mongoose.model('Compte', compteSchema);

export default Compte;