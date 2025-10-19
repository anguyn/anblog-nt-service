import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface SocketData {
  userId: string;
  email?: string;
}

export interface AuthenticatedSocket extends Socket {
  data: SocketData;
}

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    const decoded = jwt.verify(token, config.jwtSecret.jwtSecretKey) as { userId: string; email?: string };

    // Attach user info to socket
    socket.data.userId = decoded.userId;
    socket.data.email = decoded.email;

    console.log(`✅ Socket authenticated: ${decoded.userId}`);
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication failed'));
  }
};
