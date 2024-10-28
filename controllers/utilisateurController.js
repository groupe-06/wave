import Utilisateur from '../models/utilisateur.js';
import DemandeDepot from '../models/demandeDepot.js';
import Compte from '../models/compte.js';
import bcrypt from 'bcrypt';
import cloudinary from '../utils/cloudinary.js';
import { generateToken } from '../utils/extra.js';
import sendSMS from '../utils/sendSms.js';

export const createUser = async(req, res) => {
    try{
        const { nom, prenom, telephone, mdp, confirmMdp, role } = req.body;
        const file = req.file; 

        if (!nom || !prenom || !telephone ||!mdp, role) {
            return res.status(400).json({ message: 'Les champs nom, prenom, telephone, role, mot de passe et confirmation du mot de passe sont obligatoires' });
        }

        if(!["ADMIN", "MARCHAND", "AGENT", "CLIENT"].includes(role)){
            return res.status(400).json({ message: 'Le role doit être ADMIN, MARCHAND, AGENT ou CLIENT' });
        }

        if(mdp !== confirmMdp) return res.status(400).json({ message: 'Les mots de passe ne sont pas identiques' });

        const existingUser = await Utilisateur.findOne({ telephone });
        if (existingUser) return res.status(400).json({ message: 'Ce número de telefono existe já' });
    
        const hashedPassword = await bcrypt.hash(mdp, 10);

        let photoUrl = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        if (file) {
            const media = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { resource_type: 'auto' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(file.buffer);  
            });
            photoUrl = (media).secure_url;
        }

        let codeDeVerification;
        let etat = 'ACTIF'
        let premiereConnexion = false;

        if(role !== "ADMIN"){
            codeDeVerification = await generateUniqueCode();
            etat = 'INACTIF';
            premiereConnexion = true;
            await sendSMS(`+221${telephone}`, `Votre code de verification est: ${codeDeVerification}`);
        }

        let soldeMaximum;
        let cummulTransactionMensuelle;
        if(role !== "CLIENT"){
            soldeMaximum = 200000;
            cummulTransactionMensuelle = 500000;
        }

        const newUser = new Utilisateur({ nom, prenom, telephone, mdp: hashedPassword, role, photoProfile: photoUrl, premiereConnexion, codeDeVerification });
        await newUser.save();
        const compte = new Compte({ utilisateur: newUser._id, soldeMaximum, cummulTransactionMensuelle, qrcode: 'qrcode', etat });
        await compte.save();
        res.status(201).json({ message: 'Utilisateur crée avec succès', user: newUser });
    }catch(error){
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const login = async (req, res) => {
    const { telephone, mdp } = req.body;
    try {
        if(!telephone || !mdp){
            return res.status(401).json({ message: 'Le numéro de téléphone et le mot de passe est obligatoire' });
        }
        const user = await Utilisateur.findOne({ telephone }).lean();
        if (!user) {
            return res.status(401).json({ message: 'Numéro de téléphone ou mot de passe incorrect' });
        }
        // Vérifier si le compte est actif
        const compte = await Compte.findOne({ utilisateur: user._id });
        if (!compte || compte.etat !== 'ACTIF') {
            return res.status(403).json({ message: 'Compte inactif, veuillez contacter l\'administration' });
        }
        const isMatch = await bcrypt.compare(mdp.trim(), user.mdp);
        if (!isMatch) {
            return res.status(401).json({ message: 'Numéro de téléphone ou mot de passe incorrect' });
        }

        if(user.premiereConnexion){
            return res.status(401).json({ message: 'Vous n\'avez toujours pas validé votre compte' });
        }   
        const token = await generateToken(user);

        const {mdp, codeDeVerification: _, ...userWithoutPassword} = user;
        const data = {...userWithoutPassword, token};        
        
        return res.status(200).json({ message: 'User Logged in successfully', data});
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Failed to login', error });
    }
};

const generateUniqueCode = async () => {
    const generateCode = () => {
        return Math.floor(100000 + Math.random() * 900000);
    };

    let code;
    let isUnique = false;

    while (!isUnique) {
        code = generateCode();
        const existingRecharge = await Utilisateur.findOne({ code }).lean();

        if (!existingRecharge) {
            isUnique = true;
        }
    }

    return code;
};

export const regenerateVerificationCode = async(req, res) => {
    const { telephone } = req.body;

    try {
        if(!telephone){
            return res.status(400).json({ message: 'Le numéro de téléphone est obligatoire' });
        }

        const user = await Utilisateur.findOne({ telephone }).lean();

        if (!user) {
            return res.status(400).json({ message: 'Numéro de téléphone introuvale' });
        }

        const codeDeVerification = await generateUniqueCode();
        user.codeDeVerification = codeDeVerification;
        await user.save();
        await sendSMS(`+221${telephone}`, `Votre code de verification est: ${codeDeVerification}`);

        return res.status(200).json({ message: 'Code de vérification regeneré avec succès', user });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ message: 'Echec lors de la régeneration du code de vérification', error });
    }
}

export const activeAccountWithVerificationCode = async (req, res) => {
    const { codeDeVerification } = req.body;

    try {
        if(!codeDeVerification){
            return res.status(400).json({ message: 'Le code de vérification est obligatoire' });
        }

        const user = await Utilisateur.findOneAndUpdate({codeDeVerification }, { premiereConnexion: false, codeDeVerification: null }, { new: true }).lean();

        if (!user) {
            return res.status(400).json({ message: 'Code de vérification incorrect' });
        }

        await Compte.findOneAndUpdate({ utilisateur: user._id }, { etat: 'ACTIF' }, { new: true });

        return res.status(200).json({ message: 'Compte activé avec succès', user });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ message: 'Erreur lors de l\'activation de votre compte', error });
    }
}

export const faireDemandeDepot = async(req, res) =>{
    try{
        const userId = req.userId;
        let { montant } = req.body;
        montant = Number(montant);
        if(!montant)return res.status(400).json({ message: "Montant du depot requis" });
        if(montant <= 0) return res.status(400).json({ message: "Montant du depot doit être superieur à 0"});
        const user = await Utilisateur.findById(userId);
        if(!user){
            return res.status(400).json({ message: "Utilisateur inconnu" });
        }
        const compte = await Compte.findOne({ utilisateur: userId });
        if(montant > compte.soldeMaximum || (compte.soldeMaximum + montant) > compte.soldeMaximum){
            return res.status(400).json({ message: "Impossible de faire cette demande. Le montant ou la somme du montant et du solde maximum doit être inféreur ou égal au solde maximum de votre compte" });
        }
        const demandeDepot = await DemandeDepot.create({ utilisateur: userId, montant });
        return res.status(200).json({ message: "Demande de depots envoyé", demandeDepot });
    }catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Erreur lors de la demande de dépot", error: error.message });
    }
} 