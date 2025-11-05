// src/libs/socket.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from './redis';
import { config } from '../config';
import { socketAuthMiddleware, AuthenticatedSocket } from '#middlewares/socket-auth';
import { setupSocketHandlers } from '#sockets/handlers';
import { SOCKET_EVENTS } from '#sockets/events';

export let io: Server;

export function initializeSocket(httpServer: any) {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // CORS configuration for Socket.IO
  const corsOptions = {
    origin: isDevelopment
      ? [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:5173',
          config.mainAppUrl,
        ]
      : [config.mainAppUrl].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST'],
  };

  io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis adapter for horizontal scaling
  // const pubClient = redis.duplicate();
  // const subClient = redis.duplicate();
  // io.adapter(createAdapter(pubClient, subClient));

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

    // Error handler
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${userId}:`, error);
    });
  });

  console.log('✅ Socket.IO initialized with Redis adapter');
  console.log(`✅ Socket CORS enabled for: ${corsOptions.origin}`);

  return io;
}
