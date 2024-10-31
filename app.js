import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoDBConnexion from "./config/db.js";
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
import loginRoute from './routes/auth.js'; // Le fichier de route auth

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

app.use(cors());
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
