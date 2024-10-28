import Notification from '../models/notification.js';
import WebSocketService from '../services/WebSocketService.js'
class NotificationService {
    static async createNotification(userId, message, type) {
        try {
            // Créer la notification dans la base de données
            const notification = new Notification({
                compte: userId,
                message,
                type,
                etat: false,
                date: new Date()
            });
            await notification.save();

            // Émettre la notification via WebSocket
            const io = WebSocketService.getInstance();
            if (io) {
                io.to(`user-${userId}`).emit('new-notification', {
                    notification,
                    message: 'Nouvelle notification reçue'
                });
            }

            return notification;
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
            throw error;
        }
    }

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
    static async getAllNotifications(query = {}) {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const skip = (page - 1) * limit;
    
            const notifications = await Notification.find({})
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .exec();
    
            const total = await Notification.countDocuments();
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
            console.error('Erreur lors de la récupération des notifications:', error);
            throw error;
        }
    }
    

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

            // Émettre la mise à jour via WebSocket
            const io = WebSocketService.getInstance();
            if (io) {
                io.to(`user-${userId}`).emit('notification-read', {
                    notificationId,
                    message: 'Notification marquée comme lue'
                });
            }

            return {
                success: true,
                message: "Notification marquée comme lue",
                notification
            };
        } catch (error) {
            throw error;
        }
    }

    static async markAllAsRead(userId) {
        try {
            const result = await Notification.updateMany(
                { compte: userId, etat: false },
                { $set: { etat: true } }
            );

            // Émettre la mise à jour via WebSocket
            const io = WebSocketService.getInstance();
            if (io) {
                io.to(`user-${userId}`).emit('all-notifications-read', {
                    message: 'Toutes les notifications ont été marquées comme lues'
                });
            }

            return {
                success: true,
                message: "Toutes les notifications ont été marquées comme lues",
                modifiedCount: result.modifiedCount
            };
        } catch (error) {
            throw error;
        }
    }

    // Méthode pour initier le service WebSocket
    static initializeWebSocket(httpServer) {
        WebSocketService.initialize(httpServer);
    }
}

export default NotificationService;