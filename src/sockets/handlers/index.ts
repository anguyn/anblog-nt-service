import { AuthenticatedSocket } from '#middlewares/socket-auth';
import { setupNotificationHandlers } from './notification.handler';
import { setupCommentHandlers } from './comment.handler';
import { setupPostViewHandlers } from './post-view.handler';

export function setupSocketHandlers(socket: AuthenticatedSocket) {
  const userId = socket.data.userId;
  // Setup feature handlers
  setupCommentHandlers(socket);
  setupPostViewHandlers(socket);
  setupNotificationHandlers(socket);
}
