"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const ms_1 = __importDefault(require("ms"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        url: process.env.REDIS_URL || undefined,
    },
    email: {
        resendApiKey: process.env.RESEND_API_KEY,
        from: {
            email: process.env.FROM_EMAIL || 'noreply@example.com',
            name: process.env.FROM_NAME || 'App',
        },
    },
    security: {
        apiSecretKey: process.env.API_SECRET_KEY,
    },
    mainAppUrl: process.env.MAIN_APP_URL || 'http://localhost:3000',
    rateLimit: {
        verificationResend: (0, ms_1.default)((process.env.RATE_LIMIT_VERIFICATION_RESEND || '5m')),
        passwordResetResend: (0, ms_1.default)((process.env.RATE_LIMIT_PASSWORD_RESET_RESEND || '5m')),
        maxVerificationPerHour: parseInt(process.env.RATE_LIMIT_MAX_VERIFICATION_PER_HOUR || '3'),
        maxPasswordResetPerHour: parseInt(process.env.RATE_LIMIT_MAX_PASSWORD_RESET_PER_HOUR || '3'),
        maxEmailsPerUserPerMinute: parseInt(process.env.RATE_LIMIT_MAX_EMAILS_PER_USER_PER_MINUTE || '10'),
    },
    tokenExpiry: {
        verification: (0, ms_1.default)((process.env.VERIFICATION_TOKEN_EXPIRY || '24h')),
        passwordReset: (0, ms_1.default)((process.env.PASSWORD_RESET_TOKEN_EXPIRY || '1h')),
    },
    socket: {
        cors: {
            origin: process.env.MAIN_APP_URL || 'http://localhost:3000',
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
    }, // Type annotation
    jwtSecret: {
        jwtSecretKey: process.env.JWT_SECRET_KEY,
    },
};
//# sourceMappingURL=index.js.map