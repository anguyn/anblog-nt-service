// src/lib/socket.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from './redis';
import { config } from '../config';
import { socketAuthMiddleware, AuthenticatedSocket } from '#middlewares/socket-auth';
import { setupSocketHandlers } from '#sockets/handlers';
import { SOCKET_EVENTS } from '#sockets/events';

export let io: Server;

export function initializeSocket(httpServer: any) {
  io = new Server(httpServer, config.socket);

  // Redis adapter for horizontal scaling
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Authentication middleware
  io.use(socketAuthMiddleware);

  // Connection handler
  io.on(SOCKET_EVENTS.CONNECTION, (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId;
    console.log(`🔌 User connected: ${userId} (${socket.id})`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Setup event handlers
    setupSocketHandlers(socket);

    // Send welcome message
    socket.emit(SOCKET_EVENTS.SYSTEM_MESSAGE, {
      message: 'Connected to notification service',
      timestamp: new Date().toISOString(),
    });

    // Disconnect handler
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log(`🔌 User disconnected: ${userId} (${reason})`);
    });
  });

  console.log('✅ Socket.IO initialized with Redis adapter');
  return io;
}
