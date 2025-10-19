import { AuthenticatedSocket } from '#middlewares/socket-auth';
import { setupNotificationHandlers } from './notification.handler';

export function setupSocketHandlers(socket: AuthenticatedSocket) {
  setupNotificationHandlers(socket);

  // Add more handlers here
  // setupChatHandlers(socket);
  // setupPresenceHandlers(socket);
}
