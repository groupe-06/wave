import mongoose from "mongoose";
const scheduledTransactionSchema = new mongoose.Schema({
    sender: {type: mongoose.Schema.Types.ObjectId,ref: 'Utilisateur',required: true
    },
    receiver_ids: [{type: mongoose.Schema.Types.ObjectId,ref: 'Utilisateur',required: true}],
    montant: {type: Number,required: true},
    frais: {type: Boolean,default: false
    },
    dateExecution: {
        type: Date,
        required: true
    },
    statut: {
        type: String,
        enum: ['PENDING', 'EXECUTED', 'FAILED'],
        default: 'PENDING'
    },
    recurring: {
        type: Boolean,
        default: false
    },
    frequence: {
        type: String,
        enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
        required: function() { return this.recurring; }
    },
    derniereSoldeVerification: {
        type: Number,
        required: true
    }
});

const ScheduledTransaction = mongoose.model('ScheduledTransaction', scheduledTransactionSchema);

export default ScheduledTransaction;
