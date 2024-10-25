import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    frais: {type: Number, default: 0},
    etat: {type: Boolean, default: false},
    nom: {type:String, required: true}
});

const TypeTransaction = mongoose.model('TypeTransaction', transactionSchema);    

export default TypeTransaction;