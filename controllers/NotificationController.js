// controllers/NotificationController.js
import NotificationService from '../services/NotificationService.js';

class NotificationController {
    // Récupérer les notifications de l'utilisateur connecté
    static async getUserNotifications(req, res) {
        try {
            const result = await NotificationService.getUserNotifications(req.userId, req.query);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Marquer une notification comme lue
    static async markAsRead(req, res) {
        try {
            const result = await NotificationService.markAsRead(req.params.notificationId, req.userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Marquer toutes les notifications comme lues
    static async markAllAsRead(req, res) {
        try {
            const result = await NotificationService.markAllAsRead(req.userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

export default NotificationController;