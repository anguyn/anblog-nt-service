import { io } from '#lib/socket';
import { SOCKET_EVENTS } from '#sockets/events';

export class SocketService {
  /**
   * Emit notification to specific user
   */
  static emitToUser(userId: string, event: string, data: any) {
    io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit to multiple users
   */
  static emitToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach((userId) => {
      io.to(`user:${userId}`).emit(event, data);
    });
  }

  /**
   * Broadcast to all connected clients
   */
  static broadcast(event: string, data: any) {
    io.emit(event, data);
  }

  /**
   * Send notification to user
   */
  static sendNotification(userId: string, notification: any) {
    this.emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, notification);
  }

  /**
   * Send email status update
   */
  static sendEmailStatus(userId: string, status: 'sent' | 'failed', data: any) {
    const event = status === 'sent' ? SOCKET_EVENTS.EMAIL_SENT : SOCKET_EVENTS.EMAIL_FAILED;
    this.emitToUser(userId, event, data);
  }
}
