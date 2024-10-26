// routes/notificationRoutes.js
import express from 'express';
 import  getUserNotifications  from '../controllers/NotificationController.js';
import   markAsRead from '../controllers/NotificationController.js';
import  markAllAsRead from '../controllers/NotificationController.js';
import { getToken } from '../middlewares/authMiddleware.js';


const notificationRouter = express.Router();

// Route pour récupérer les notifications de l'utilisateur connecté
notificationRouter.get('/', getToken, getUserNotifications);
notificationRouter.patch('/:notificationId/read',getToken ,markAsRead);
notificationRouter.patch('/read-all', getToken, markAllAsRead);

export default notificationRouter;