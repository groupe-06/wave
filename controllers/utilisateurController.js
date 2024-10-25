import Utilisateur from '../models/utilisateur.js';
import Compte from '../models/compte.js';
import bcrypt from 'bcrypt';
import cloudinary from '../utils/cloudinary.js';
import { generateToken } from '../utils/extra.js';

export const createUser = async(req, res) => {
    try{
        const { nom, prenom, telephone, mdp, confirmMdp, role } = req.body;
        const file = req.file; 

        if (!nom || !prenom || !telephone ||!mdp) {
            return res.status(400).json({ message: 'Les champs nom, prenom, telephone, mot de passe et confirmation du mot de passe sont obligatoires' });
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

        const newUser = new Utilisateur({ nom, prenom, telephone, mdp: hashedPassword, role, photoProfile: photoUrl });
        await newUser.save();
        const compte = new Compte({ utilisateur: newUser._id, soldeMaximum: 50000, cummulTransactionMensuelle: 200000, qrcode: 'qrcode', etat: 'ACTIF' });
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
        const token = await generateToken(user);

        const {mdp: _, ...userWithoutPassword} = user;
        const data = {...userWithoutPassword, token};        
        
        return res.status(200).json({ message: 'User Logged in successfully', data});
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Failed to login', error });
    }
};