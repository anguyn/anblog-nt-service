"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
exports.initializeSocket = initializeSocket;
// src/lib/socket.ts
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("./redis");
const config_1 = require("../config");
const socket_auth_1 = require("../middlewares/socket-auth");
const handlers_1 = require("../sockets/handlers");
const events_1 = require("../sockets/events");
function initializeSocket(httpServer) {
    exports.io = new socket_io_1.Server(httpServer, config_1.config.socket);
    // Redis adapter for horizontal scaling
    const pubClient = redis_1.redis.duplicate();
    const subClient = redis_1.redis.duplicate();
    exports.io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
    // Authentication middleware
    exports.io.use(socket_auth_1.socketAuthMiddleware);
    // Connection handler
    exports.io.on(events_1.SOCKET_EVENTS.CONNECTION, (socket) => {
        const userId = socket.data.userId;
        console.log(`🔌 User connected: ${userId} (${socket.id})`);
        // Join user's personal room
        socket.join(`user:${userId}`);
        // Setup event handlers
        (0, handlers_1.setupSocketHandlers)(socket);
        // Send welcome message
        socket.emit(events_1.SOCKET_EVENTS.SYSTEM_MESSAGE, {
            message: 'Connected to notification service',
            timestamp: new Date().toISOString(),
        });
        // Disconnect handler
        socket.on(events_1.SOCKET_EVENTS.DISCONNECT, (reason) => {
            console.log(`🔌 User disconnected: ${userId} (${reason})`);
        });
    });
    console.log('✅ Socket.IO initialized with Redis adapter');
    return exports.io;
}
//# sourceMappingURL=socket.js.map