"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const socketAuthMiddleware = (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        if (!token) {
            return next(new Error('Authentication token missing'));
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret.jwtSecretKey);
        // Attach user info to socket
        socket.data.userId = decoded.userId;
        socket.data.email = decoded.email;
        console.log(`✅ Socket authenticated: ${decoded.userId}`);
        next();
    }
    catch (error) {
        console.error('Socket auth error:', error);
        next(new Error('Authentication failed'));
    }
};
exports.socketAuthMiddleware = socketAuthMiddleware;
//# sourceMappingURL=socket-auth.js.map