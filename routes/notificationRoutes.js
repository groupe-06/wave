// routes/notificationRoutes.js
import express from 'express';
import {getUserNotifications,markAsRead,markAllAsRead} from '../controllers/NotificationController.js';
import { getToken } from '../middlewares/authMiddleware.js';


const notificationRouter = express.Router();

// Route pour récupérer les notifications de l'utilisateur connecté
notificationRouter.get('/', getToken, getUserNotificatinotificationRouter);
notificationRouter.patch('/:notificationId/read',getToken , markAsRnotificationRouter);
notificationRouter.patch('/read-all', getToken, markAllAsRead);

export default notificationRouter;