// routes/notificationRoutes.js
import express from 'express';
import NotificationController from '../controllers/NotificationController.js';
import { getToken } from '../middlewares/authMiddleware.js';


const notificationRouter = express.Router();

// Route pour récupérer les notifications de l'utilisateur connecté
notificationRouter.get('/user-notifications', getToken, NotificationController.getUserNotifications);
notificationRouter.patch('/:notificationId/read',getToken ,NotificationController.markAsRead);
notificationRouter.patch('/read-all', getToken, NotificationController.markAllAsRead);
// Route pour récupérer toutes les notifications
notificationRouter.get('/all-notifications', NotificationController.getAllNotifications);

export default notificationRouter;