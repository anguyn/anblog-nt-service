"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupNotificationHandlers = setupNotificationHandlers;
const events_1 = require("../events");
function setupNotificationHandlers(socket) {
    const userId = socket.data.userId;
    // Client marks notification as read
    socket.on(events_1.SOCKET_EVENTS.NOTIFICATION_READ, async (notificationId) => {
        try {
            // Update notification in DB
            console.log(`Notification ${notificationId} marked as read by ${userId}`);
            // Acknowledge back to client
            socket.emit(events_1.SOCKET_EVENTS.NOTIFICATION_READ, {
                success: true,
                notificationId,
            });
        }
        catch (error) {
            socket.emit('error', { message: 'Failed to mark notification as read' });
        }
    });
    // Client marks all notifications as read
    socket.on(events_1.SOCKET_EVENTS.NOTIFICATION_READ_ALL, async () => {
        try {
            console.log(`All notifications marked as read by ${userId}`);
            socket.emit(events_1.SOCKET_EVENTS.NOTIFICATION_READ_ALL, { success: true });
        }
        catch (error) {
            socket.emit('error', { message: 'Failed to mark all as read' });
        }
    });
}
//# sourceMappingURL=notification.handler.js.map