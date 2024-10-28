import mongoose from "mongoose";

const demandeDepotSchema = new mongoose.Schema({
    utilisateur: {type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true},
    montant: {type: Number, required: true, min: 1, max: 500000},
    dateCreation: {type: Date, default: Date.now},
    etat: {type: String, enum: ['EN_ATTENTE', 'EN_COURS', 'VALIDE'], default: 'EN_ATTENTE', required: true}
});

const DemandeDepot = mongoose.model('DemandeDepot', demandeDepotSchema);

export default DemandeDepot;