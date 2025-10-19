"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_1 = require("../lib/socket");
const events_1 = require("../sockets/events");
class SocketService {
    /**
     * Emit notification to specific user
     */
    static emitToUser(userId, event, data) {
        socket_1.io.to(`user:${userId}`).emit(event, data);
    }
    /**
     * Emit to multiple users
     */
    static emitToUsers(userIds, event, data) {
        userIds.forEach((userId) => {
            socket_1.io.to(`user:${userId}`).emit(event, data);
        });
    }
    /**
     * Broadcast to all connected clients
     */
    static broadcast(event, data) {
        socket_1.io.emit(event, data);
    }
    /**
     * Send notification to user
     */
    static sendNotification(userId, notification) {
        this.emitToUser(userId, events_1.SOCKET_EVENTS.NOTIFICATION_NEW, notification);
    }
    /**
     * Send email status update
     */
    static sendEmailStatus(userId, status, data) {
        const event = status === 'sent' ? events_1.SOCKET_EVENTS.EMAIL_SENT : events_1.SOCKET_EVENTS.EMAIL_FAILED;
        this.emitToUser(userId, event, data);
    }
}
exports.SocketService = SocketService;
//# sourceMappingURL=socket.service.js.map