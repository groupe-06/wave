import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import Utilisateur from '../models/utilisateur.js';
import Transaction from '../models/transaction.js';

// Fonction pour créer un utilisateur factice
const createFakeUser = async () => {
    try {
        const user = new Utilisateur({
            nom: faker.person.lastName(),
            prenom: faker.person.firstName(),
            telephone: faker.phone.number('06########'),
            cni: faker.string.alphanumeric(12),
            mdp: faker.internet.password(),
            role: faker.helpers.arrayElement(['CLIENT', 'MARCHAND', 'AGENT']),
            photo: faker.image.avatar()
        });
        
        return await user.save();
    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        throw error;
    }
};

// Fonction pour créer une transaction factice
const createFakeTransaction = async (sender, receiver) => {
    if (!sender?._id || !receiver?._id) {
        throw new Error('Sender and receiver must be valid users with _id');
    }

    try {
        const transaction = new Transaction({
            receiver: receiver._id,
            sender: sender._id,
            montant: faker.number.int({ min: 100, max: 10000 }),
            etat: faker.helpers.arrayElement(['SUCCES', 'ECHEC', 'ANNULER']),
            TypeTransaction: new mongoose.Types.ObjectId()
        });
        
        return await transaction.save();
    } catch (error) {
        console.error('Erreur lors de la création de la transaction:', error);
        throw error;
    }
};


// Fonction pour générer des données de test
const generateTestData = async () => {
    try {
        // Créer deux utilisateurs
        const user1 = await createFakeUser();
        const user2 = await createFakeUser();

        if (!user1?._id || !user2?._id) {
            throw new Error('Failed to create test users');
        }

        // Créer une transaction entre eux
        const transaction = await createFakeTransaction(user1, user2);

        if (!transaction?._id) {
            throw new Error('Failed to create test transaction');
        }

        return {
            users: [user1, user2],
            transaction,
            success: true
        };
    } catch (error) {
        console.error('Erreur lors de la génération des données de test:', error);
        throw error;
    }
};




export {
    createFakeUser,
    createFakeTransaction,
    generateTestData
};