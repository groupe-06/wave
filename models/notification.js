import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    compte: {type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true},
    message: {type: String, required: true},
    date: {type: Date, default: Date.now},
    etat: {type: Boolean, default: false},
    type: String
});

const Notification = mongoose.model('Notification', notificationSchema);    

export default Notification;