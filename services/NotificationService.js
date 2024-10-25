// services/NotificationService.js
import Notification from '../models/notification.js';

class NotificationService {
    static async getUserNotifications(userId, query = {}) {
        try {
            // Récupérer les paramètres de pagination de la requête
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const skip = (page - 1) * limit;

            // Construire le filtre de base
            const filter = { compte: userId };
            
            // Ajouter le filtre d'état si spécifié
            if (query.etat !== undefined) {
                filter.etat = query.etat === 'true';
            }

            // Récupérer les notifications avec pagination
            const notifications = await Notification.find(filter)
                .sort({ date: -1 }) // Trier par date décroissante
                .skip(skip)
                .limit(limit)
                .exec();

            // Compter le nombre total de notifications
            const total = await Notification.countDocuments(filter);

            // Calculer le nombre total de pages
            const totalPages = Math.ceil(total / limit);

            return {
                success: true,
                data: {
                    notifications,
                    pagination: {
                        currentPage: page,
                        totalPages,
                        totalItems: total,
                        itemsPerPage: limit
                    }
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Méthode pour marquer une notification comme lue
    static async markAsRead(notificationId, userId) {
        try {
            const notification = await Notification.findOne({
                _id: notificationId,
                compte: userId
            });

            if (!notification) {
                throw new Error("Notification non trouvée ou non autorisée");
            }

            notification.etat = true;
            await notification.save();

            return {
                success: true,
                message: "Notification marquée comme lue",
                notification
            };
        } catch (error) {
            throw error;
        }
    }

    // Méthode pour marquer toutes les notifications d'un utilisateur comme lues
    static async markAllAsRead(userId) {
        try {
            const result = await Notification.updateMany(
                { compte: userId, etat: false },
                { $set: { etat: true } }
            );

            return {
                success: true,
                message: "Toutes les notifications ont été marquées comme lues",
                modifiedCount: result.modifiedCount
            };
        } catch (error) {
            throw error;
        }
    }
}

export default NotificationService;