import { io } from '#lib/socket';
import { SOCKET_EVENTS } from '#sockets/events';
export class SocketService {
    /**
     * Emit notification to specific user
     */
    static emitToUser(userId, event, data) {
        io.to(`user:${userId}`).emit(event, data);
    }
    /**
     * Emit to multiple users
     */
    static emitToUsers(userIds, event, data) {
        userIds.forEach((userId) => {
            io.to(`user:${userId}`).emit(event, data);
        });
    }
    /**
     * Broadcast to all connected clients
     */
    static broadcast(event, data) {
        io.emit(event, data);
    }
    /**
     * Send notification to user
     */
    static sendNotification(userId, notification) {
        this.emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, notification);
    }
    /**
     * Send email status update
     */
    static sendEmailStatus(userId, status, data) {
        const event = status === 'sent' ? SOCKET_EVENTS.EMAIL_SENT : SOCKET_EVENTS.EMAIL_FAILED;
        this.emitToUser(userId, event, data);
    }
}
//# sourceMappingURL=socket.service.js.map