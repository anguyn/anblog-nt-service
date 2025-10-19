import jwt from 'jsonwebtoken';
import { config } from '../config';
export const socketAuthMiddleware = (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        if (!token) {
            return next(new Error('Authentication token missing'));
        }
        const decoded = jwt.verify(token, config.jwtSecret.jwtSecretKey);
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
//# sourceMappingURL=socket-auth.js.map