export declare class SocketService {
    /**
     * Emit notification to specific user
     */
    static emitToUser(userId: string, event: string, data: any): void;
    /**
     * Emit to multiple users
     */
    static emitToUsers(userIds: string[], event: string, data: any): void;
    /**
     * Broadcast to all connected clients
     */
    static broadcast(event: string, data: any): void;
    /**
     * Send notification to user
     */
    static sendNotification(userId: string, notification: any): void;
    /**
     * Send email status update
     */
    static sendEmailStatus(userId: string, status: 'sent' | 'failed', data: any): void;
}
//# sourceMappingURL=socket.service.d.ts.map