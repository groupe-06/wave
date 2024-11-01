import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoDBConnexion from "./db/mongo-connexion.js";
import typeTransactionRoute from "./routes/typeTransactionRoute.js";
import transactionClientRoute from "./routes/tranfertRoute.js";
import userRoute from "./routes/userRoute.js";
import compteRoute from "./routes/compteRoute.js";

import transactionRoutes from './routes/transactionRoutes.js';
import notificationRouter from './routes/notificationRoutes.js';

import adminRoute from "./routes/adminRoute.js";
import deplafonRoute from "./routes/deplafonRoute.js"; 
import transactionRoute from "./routes/listeTransaction.js"; 
import changeCompteRoute from "./routes/changeCompteRoute.js";
import updatePasswordRoute from "./routes/updatePasswordRoute.js";

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();
const BASE_URI = process.env.BASE_URI ;

// Créer un serveur HTTP à partir de l'app Express
const httpServer = createServer(app);

// Configurer Socket.IO avec CORS
const io = new Server(httpServer, {
    cors: {
        origin: "*", // À adapter selon vos besoins de sécurité
        methods: ["GET", "POST"]
    }
});
const corsOptions = {
    origin: 'http://localhost:4200', // URL exacte de votre frontend Angular
    credentials: true, // Autoriser les credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  

app.use(cors(corsOptions));
app.use(express.json());

mongoDBConnexion();

// Rendre io accessible dans les routes
app.set('io', io);

app.use(`${BASE_URI}/type-transaction`, typeTransactionRoute);
app.use(`${BASE_URI}/client`, transactionClientRoute);
app.use(`${BASE_URI}/admin`, adminRoute);
app.use(`${BASE_URI}/user`, userRoute);
app.use(`${BASE_URI}/compte`, compteRoute);

app.use(`${BASE_URI}/Transactions`, transactionRoutes);
app.use(`${BASE_URI}/Notifications`, notificationRouter);

app.use(`${BASE_URI}/transactions`, transactionRoute);
app.use(`${BASE_URI}/utilisateurs`, changeCompteRoute);
app.use(`${BASE_URI}/user`, updatePasswordRoute);
app.use(`${BASE_URI}/deplafonnement`, deplafonRoute);




/*app.post(`${BASE_URI}/generate-test-data`, async (req, res) => {
    try {
        await generateTestData();
        res.status(200).json({ message: 'Données de test générées avec succès' });
    } catch (error) {
        console.error('Erreur lors de la génération des données:', error);
        res.status(500).json({ error: 'Erreur lors de la génération des données' });
    }
});*/

// Gérer les connexions Socket.IO
io.on('connection', (socket) => {
    console.log('Un client est connecté', socket.id);

    // Joindre une room spécifique à l'utilisateur
    socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} a rejoint sa room`);
    });

    // Exemple d'événement pour les nouvelles transactions
    socket.on('new-transaction', (transaction) => {
        // Émettre aux utilisateurs concernés
        io.to(`user-${transaction.receiverId}`).emit('transaction-received', transaction);
    });

    // Exemple d'événement pour les notifications
    socket.on('new-notification', (notification) => {
        // Émettre la notification à l'utilisateur concerné
        io.to(`user-${notification.userId}`).emit('notification-received', notification);
    });

    socket.on('disconnect', () => {
        console.log('Client déconnecté', socket.id);
    });
});

// Utiliser httpServer au lieu de app.listen
httpServer.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
