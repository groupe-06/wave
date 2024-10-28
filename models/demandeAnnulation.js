import mongoose from "mongoose";

const DemandeAnnulationShema = new mongoose.Schema({
    transaction: {type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true},
    utilisateur: {type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true},
    motif: {type: String, required: true},
    etat: {type: String, default: 'EN_ATTENTE'},
    dateDemande: {type: Date, default: Date.now},
});

const DemandeAnnulation = mongoose.model('DemandeAnnulation', DemandeAnnulationShema);    

export default DemandeAnnulation;