// services/WebSocketService.js
import { Server } from 'socket.io';

class WebSocketService {
    static io;
    
    static initialize(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.io.on('connection', (socket) => {
            console.log('Client connecté:', socket.id);

            socket.on('join-user', (userId) => {
                socket.join(`user-${userId}`);
                console.log(`Utilisateur ${userId} a rejoint sa room`);
            });

            socket.on('disconnect', () => {
                console.log('Client déconnecté:', socket.id);
            });
        });
    }

    static getInstance() {
        return this.io;
    }
}
export default WebSocketService ;
