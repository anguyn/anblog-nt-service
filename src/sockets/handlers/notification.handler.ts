// src/sockets/handlers/notification.handler.ts
import { AuthenticatedSocket } from '#middlewares/socket-auth';
import { SOCKET_EVENTS } from '../events';

export function setupNotificationHandlers(socket: AuthenticatedSocket) {
  const userId = socket.data.userId;

  // Client marks notification as read
  socket.on(SOCKET_EVENTS.NOTIFICATION_READ, async (notificationId: string) => {
    try {
      // Update notification in DB
      console.log(`Notification ${notificationId} marked as read by ${userId}`);

      // Acknowledge back to client
      socket.emit(SOCKET_EVENTS.NOTIFICATION_READ, {
        success: true,
        notificationId,
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  });

  // Client marks all notifications as read
  socket.on(SOCKET_EVENTS.NOTIFICATION_READ_ALL, async () => {
    try {
      console.log(`All notifications marked as read by ${userId}`);
      socket.emit(SOCKET_EVENTS.NOTIFICATION_READ_ALL, { success: true });
    } catch (error) {
      socket.emit('error', { message: 'Failed to mark all as read' });
    }
  });
}
