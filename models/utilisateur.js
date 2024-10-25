import mongoose from "mongoose";

const utilisateurSchema = new mongoose.Schema({
    nom: {type: String, required: [true, 'Le nom est obligatoire'], minLenght: 2, maxLenght: 50},
    prenom: {type: String, required: [true, 'Le prenom est obligatoire'], minLenght: 2, maxLenght: 50},
    telephone: {type: String, required: [true, 'Le téléphone est obligatoire'], unique: true, minLenght: 2, maxLenght: 50},
    photoPiece1: String,
    photoPiece2: String,
    mdp: {type: String, required: true, minLenght: 2, maxLenght: 100},
    role: {type: String, enum: ['ADMIN', 'CLIENT', 'MARCHAND', 'AGENT'], default: 'CLIENT'},
    photoProfile: String,
});

const Utilisateur = mongoose.model('Utilisateur', utilisateurSchema);

export default Utilisateur;