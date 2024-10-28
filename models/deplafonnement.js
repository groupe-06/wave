import mongoose from "mongoose";

const deplafonnementSchema = new mongoose.Schema({
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    photoPiece1: { type: String, required: true },
    photoPiece2: { type: String },
    status: {
        type: String,
        enum: ['EN_COURS', 'VALIDÉ', 'REJETÉ'], // Include EN_COURS as a valid value
        default: 'EN_COURS'
    },
    dateCreation: { type: Date, default: Date.now }
});

const Deplafonnement = mongoose.model('Deplafonnement', deplafonnementSchema);

export default Deplafonnement;
