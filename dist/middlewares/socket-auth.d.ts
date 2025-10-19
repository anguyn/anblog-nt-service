import { Socket } from 'socket.io';
interface SocketData {
    userId: string;
    email?: string;
}
export interface AuthenticatedSocket extends Socket {
    data: SocketData;
}
export declare const socketAuthMiddleware: (socket: Socket, next: (err?: Error) => void) => void;
export {};
//# sourceMappingURL=socket-auth.d.ts.map