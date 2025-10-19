import type { ServerOptions } from 'socket.io';
export declare const config: {
    port: string | number;
    nodeEnv: string;
    redis: {
        host: string;
        port: number;
        password: string | undefined;
        url: string | undefined;
    };
    email: {
        resendApiKey: string;
        from: {
            email: string;
            name: string;
        };
    };
    security: {
        apiSecretKey: string;
    };
    mainAppUrl: string;
    rateLimit: {
        verificationResend: number;
        passwordResetResend: number;
        maxVerificationPerHour: number;
        maxPasswordResetPerHour: number;
        maxEmailsPerUserPerMinute: number;
    };
    tokenExpiry: {
        verification: number;
        passwordReset: number;
    };
    socket: Partial<ServerOptions>;
    jwtSecret: {
        jwtSecretKey: string;
    };
};
//# sourceMappingURL=index.d.ts.map